
exports.handler = (event: any, context: any, callback: Function) => {
  console.warn('[From Typescript]');
  console.warn('Event not processed.');

  callback(null, 'Hello from Lambda with Typescript');
}
