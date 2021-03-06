const { createServer, configureDefaultChannelDriver } = require('shocked');
const TodoService = require('./TodoService');

const port = process.env.PORT || 3001;

const server = createServer({
  Channel: configureDefaultChannelDriver({ queueSize: 5 }),
});

// Associate the todoService with a url
server.serve(new TodoService(server));

server.start({ port });
console.log('Server started at', port);
