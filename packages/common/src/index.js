class ParserError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }

    this.original = cause;
    const lines = (message.match(/\n/g) || []).length + 1;
    // eslint-disable-next-line prefer-template
    this.stack = this.stack.split('\n').slice(0, lines).join('\n') + '\n' + cause.stack;
  }
}

// const TYPE_RPC_REQUEST = 1;
// const TYPE_RPC_RESPONSE = 2;
// const TYPE_EVENT = 3;
// const TYPE_ACTION = 4;
// const TYPE_SCOPE_REQUEST = 5;
// const TYPE_SCOPE_RESPONSE = 6;
// const TYPE_CALL = 7;
// const TYPE_TRACKER_RPC_REQUEST = 8;
// const TYPE_TRACKER_RPC_RESPONSE = 9;
// const TYPE_TRACKER_CLOSE = 10;
// const TYPE_TRACKER_EVENT = 11;
// const TYPE_PROXY_SCOPE_REQUEST = 12;

const TYPE_TRACKER_CREATE = 13;
const TYPE_TRACKER_ACTION = 14;
const TYPE_TRACKER_CREATE_NEW = 15;
const TYPE_TRACKER_CREATE_UPDATE = 16;
const TYPE_TRACKER_API = 17;
const TYPE_TRACKER_API_RESPONSE = 18;
const TYPE_TRACKER_EMIT = 19;
const TYPE_TRACKER_CLOSE = 20;
const TYPE_TRACKER_CREATE_FAIL = 21;

const METHOD_MAPS = {
  [TYPE_TRACKER_CREATE]: 'onTrackerCreate',
  [TYPE_TRACKER_ACTION]: 'onTrackerAction',
  [TYPE_TRACKER_CREATE_NEW]: 'onTrackerCreateNew',
  [TYPE_TRACKER_CREATE_UPDATE]: 'onTrackerCreateUpdate',
  [TYPE_TRACKER_API]: 'onTrackerApi',
  [TYPE_TRACKER_API_RESPONSE]: 'onTrackerApiResponse',
  [TYPE_TRACKER_EMIT]: 'onTrackerEmit',
  [TYPE_TRACKER_CLOSE]: 'onTrackerClose',
};

exports.PKT_TRACKER_CREATE = (group, params, serial) => (
  JSON.stringify([TYPE_TRACKER_CREATE, group, params, serial])
);

exports.PKT_TRACKER_ACTION = (group, action) => (
  JSON.stringify([TYPE_TRACKER_ACTION, group, action])
);

exports.PKT_TRACKER_CREATE_FAIL = (group, err) => (
  JSON.stringify([TYPE_TRACKER_CREATE_FAIL, group, err])
);

exports.PKT_TRACKER_CREATE_NEW = (group, serial, data, apis) => (
  JSON.stringify([TYPE_TRACKER_CREATE_NEW, group, serial, data, apis])
);

exports.PKT_TRACKER_CREATE_UPDATE = (group, serial, actions) => (
  JSON.stringify([TYPE_TRACKER_CREATE_UPDATE, group, serial, actions])
);

exports.PKT_TRACKER_API = (group, apiId, name, args) => (
  JSON.stringify([TYPE_TRACKER_API, group, apiId, name, args])
);

exports.PKT_TRACKER_API_RESPONSE = (group, apiId, result, response, params) => (
  JSON.stringify([TYPE_TRACKER_API_RESPONSE, group, apiId, result, response, params])
);

exports.PKT_TRACKER_EMIT = (group, event, data) => (
  JSON.stringify([TYPE_TRACKER_EMIT, group, event, data])
);

exports.PKT_TRACKER_CLOSE = group => (
  JSON.stringify([TYPE_TRACKER_CLOSE, group])
);

exports.createParser = () => {
  const parser = {
    parse: (message) => {
      try {
        const data = JSON.parse(message);
        if (!Array.isArray(data)) {
          throw new Error('Invalid message format');
        }

        const [type, ...other] = data;
        const method = METHOD_MAPS[type];
        if (!method) {
          throw new Error(`Unknown message type - ${type}`);
        }

        if (!parser[method]) {
          throw new Error(`No parser defined for - ${method}`);
        }

        try {
          parser[method].apply(null, other);
        } catch (err) {
          throw new ParserError(`Error executing parser - ${method} - ${err.message}`, err);
        }
      } catch (err) {
        if (parser.onError) {
          parser.onError(err);
        } else {
          // eslint-disable-next-line no-console
          console.error('Error parsing message', err);
        }
      }
    },
  };

  return parser;
};
