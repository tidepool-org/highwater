/*
 *  == BSD2 LICENSE ==
 */

'use strict';

var _ = require('lodash');
var log = require('../log.js')('dynamoDbClient.js');
var AWS = require('aws-sdk');

module.exports = function(awsconfig, tablename) {
  AWS.config.update(awsconfig);
  var db = new AWS.DynamoDB();

  return {
    submit: function(user, eventName, event) {
      // fill in the required parameters
      var parms = {
        _p: user,
        _n: eventName
      };
      // do the timestamp if it's specified
      var args = _.clone(event);
      log.info('metric[%s], user[%s]: %j', parms._n, parms._p, event);

      if (args.timestamp) {
        parms._t = args.timestamp;
      } else {
        parms._t = Date.now();
      }

      // copy the rest of the query parameters
      parms = _.assign(parms, _.omit(args, 'timestamp'));

      // now build the item we'll submit to dynamo
      // DynamoDB has a weird way of storing values -- instead of key: value,
      // they want key: { type: value }, where value is always a string.
      var item = _.mapValues(parms, function(value, key) {
        if (_.isString(value)) {
          return { S: value };
        } else if (_.isFinite(value)) {
          return { N: value.toString() };
        } else if (_.isBoolean(value)) {
          return { BOOL: value };
        } else if (_.isArray(value) && _.isString(value[0])) {
          return { SS: value };
        } else {
          // convert it to a string and call it a string
          return { S: value.toString() };
        }
      });

      // build the query to dynamodb
      var req = {
        'TableName' : tablename,
        'Item': item
      };

      // and do the request
      log.warn(req);
      db.putItem(req, function (error, data) {
        // doesn't matter if it worked, get on with our lives.
        if (error != null) {
          log.error('Problem when submitting request to AWS DynamoDB', error, data);
        }
      });
    }
  };
};