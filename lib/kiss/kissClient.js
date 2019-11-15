/*
 *  == BSD2 LICENSE ==
 */

'use strict';

var _ = require('lodash');
var request = require('request');

var log = require('../log.js')('kissClient.js');

module.exports = function(apiKey, metricsHost) {
  return {
    submit: function(user, eventName, event){
      // fill in the required parameters
      var parms = {
        _p: user,
        _k: apiKey,
        _n: eventName
      };
      // do the timestamp if it's specified
      var args = _.clone(event);
      //log.info('metric[%s], user[%s]: %j', parms._n, parms._p, event);

      if (args.timestamp) {
        parms._t = args.timestamp;
        parms._d = 1;
      }

      // copy the rest of the query parameters
      parms = _.assign(parms, _.omit(args, 'timestamp'));

      // build the query to kissmetrics
      var reqOptions = {
        uri: metricsHost,
        qs: parms,
        method: 'GET'
      };

      // and do the request
      log.debug(reqOptions);
      request(reqOptions, function (error, response, body) {
        // doesn't matter if it worked, get on with our lives.
        if (error != null) {
          log.error(error, "Problem when submitting request to kiss");
        }
      });
    }
  };
};

