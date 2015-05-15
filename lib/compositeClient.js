/*
 * == BSD2 LICENSE ==
 */

'use strict';

var except = require('amoeba').except;

var log = require('./log.js')('compositeClient.js');

module.exports = function(clients) {
  // if there are no clients, then we don't do anything
  // Could add a logging statement here if it's helpful
  if (clients.length === 0) {
    return { submit: function() {} }
  } else {
    // sanity check
    for (var i = 0; i < clients.length; ++i) {
      if (typeof(clients[i].submit) !== 'function') {
        throw except.IAE('Got a client[%d:%j] without a submit method!?: %s', i, clients[i], typeof(clients[i].submit));
      }
    }

    // looks good, let's do a composite submit
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
  }
};