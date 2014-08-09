/*
 * == BSD2 LICENSE ==
 */

'use strict';

var log = require('../log.js')('filteredKissClient.js');

module.exports = function(predicate, kissClient) {
  return {
    submit: function(user, eventName, event) {
      if (predicate(user, eventName, event)) {
        kissClient.submit(user, eventName, event);
      }
    }
  }

};