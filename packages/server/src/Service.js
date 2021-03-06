const UrlPattern = require('url-pattern');
const Session = require('./Session');
const Tracker = require('./Tracker');
const Channel = require('./Channel');

const configureDefaultChannelDriver = require('./DefaultChannelDriver');

function validateTracker(ServiceTracker) {
  if (ServiceTracker === null) {
    throw new Error('Not a valid Tracker class. All tracker classes must extend from `Tracker`');
  }

  if (ServiceTracker === Tracker) {
    return true;
  }

  return validateTracker(Object.getPrototypeOf(ServiceTracker));
}

function extractName(TrackerClass) {
  const className = TrackerClass.prototype.constructor.name;
  if (className.endsWith('Tracker')) {
    return className.substr(0, className.length - 7);
  }

  return className;
}

class Service {
  constructor(server, { url, host } = {}) {
    this.server = server;
    this.urlMatcher = url ? new UrlPattern(url) : null;
    this.host = host;
    this.trackers = {};
    this.channelDriver = null;
  }

  close() {
    // Perform cleanup when the server is closing
    if (this.onClose) {
      this.close();
    }
  }

  setChannelDriver(channelDriver) {
    if (!this.channelDriver) {
      this.channelDriver = channelDriver || configureDefaultChannelDriver();
    }
  }

  registerTracker(ServiceTracker, name = null) {
    validateTracker(ServiceTracker);

    const trackerName = name || extractName(ServiceTracker);

    if (!trackerName || !ServiceTracker) {
      throw new Error(`Invalid tracker registration ${trackerName} -> ${ServiceTracker}`);
    }

    if (this.trackers[trackerName]) {
      throw new Error(`Tracker ${trackerName} is already registered`);
    }

    const allMethods = Object.getOwnPropertyNames(ServiceTracker.prototype);
    const nonApis = Object.getOwnPropertyNames(Tracker.prototype);
    const apis = allMethods.filter(api => !nonApis.includes(api));

    if (apis.length === 0) {
      throw new Error(`No apis available with the tracker ${ServiceTracker.constructor.name}`);
    }

    this.trackers[trackerName] = {
      TrackerClass: ServiceTracker,
      apis: apis.reduce((res, n) => {
        res[n] = ServiceTracker.prototype[n];
        return res;
      }, {}),
    };
  }

  findChannelInstance(channel) {
    return this.channelDriver.findInstance(channel);
  }

  subscribe(channel, listener) {
    const instance = this.channelDriver.getInstance(channel);
    instance.subscribe(listener);
    return instance;
  }

  unsubscribe(channel, listener) {
    const instance = this.channelDriver.findInstance(channel);
    if (instance) {
      instance.unsubscribe(listener);
    }
    return instance;
  }

  async createTracker(trackerName, session, params) {
    const info = this.trackers[trackerName];

    if (!info) {
      throw new Error(`No tracker found for ${trackerName}`);
    }

    const { TrackerClass } = info;
    const tracker = new TrackerClass(session, params, trackerName);
    const channel = await tracker.onCreate();
    if (!(channel instanceof Channel)) {
      throw new Error(`${trackerName}Tracker must return a channel on create.`);
    }

    // Setup channel and channelInstance
    const channelInstance = this.channelDriver.getInstance(channel);
    tracker.start(channel, channelInstance);
    return tracker;
  }

  validateTrackerApi(trackerName, api) {
    const { apis } = this.trackers[trackerName];
    if (!apis[api]) {
      throw new Error(`Api ${trackerName}.${api} is not found`);
    }

    return apis[api];
  }

  getTrackerApis(trackerName) {
    const { apis } = this.trackers[trackerName];
    return Object.keys(apis);
  }

  match(request) {
    if (this.host && this.host !== request.headers.host) {
      return false;
    }

    const params = this.urlMatcher ? this.urlMatcher.match(request.url) : {};
    if (params === null) {
      return false;
    }

    return { params };
  }

  validate(inp) {
    if (this.onValidate) {
      return this.onValidate(inp);
    }
    return inp;
  }

  createSession(ws, input) {
    return new Session(this, ws, input);
  }

  start(input, ws) {
    const session = this.createSession(ws, input);
    if (this.onStart) {
      this.onStart(session);
    }
  }
}

module.exports = Service;
