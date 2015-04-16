/*
 * == BSD2 LICENSE ==
 */

'use strict';

var except = require('amoeba').except;

var log = require('../log.js')('compositeClient.js');

module.exports = function() {
  var clients = arguments;

  for (var i = 0; i < clients.length; ++i) {
    if (typeof(clients[i].submit) !== 'function') {
      throw except.IAE('Got a client[%d:%j] without a submit method!?: %s', i, clients[i], typeof(clients[i].submit));
    }
  }

  return {
    submit: function(user, eventName, event) {
      for (var i = 0; i < clients.length; ++i) {
        try {
          clients[i].submit(user, eventName, event);
        }
        catch (e) {
          log.warn(e, 'Error when submitting event[%s:%s] to client[%s]', eventName, event, clients[i]);
        }
      }
    }
  }
};