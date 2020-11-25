/*
 == BSD2 LICENSE ==
 Copyright (c) 2014, Tidepool Project
 
 This program is free software; you can redistribute it and/or modify it under
 the terms of the associated License, which is identical to the BSD 2-Clause
 License as published by the Open Source Initiative at opensource.org.
 
 This program is distributed in the hope that it will be useful, but WITHOUT
 ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 FOR A PARTICULAR PURPOSE. See the License for more details.
 
 You should have received a copy of the License along with this program; if
 not, you can obtain one from Tidepool Project at tidepool.org.
 == BSD2 LICENSE ==
 */

'use strict';

var _ = require('lodash');
var crypto = require('crypto-js');
var log = require('../log.js')('highwaterApi.js');
var events = require('../events.js')(log);

/*
 Http interface for group-api
 */
module.exports = function (salt, eventsProducer) {
  var message = {}
  /*
   HELPERS
   */
  function hash_id(userid, len) {
    var hash = crypto.algo.SHA1.create();
    hash.update(salt);
    hash.update(userid);
    return hash.finalize().toString().substr(0, len);
  }

  return {
    /** HEALTH CHECK **/
    status: function (req, res, next) {
      log.debug('status: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      res.send(200, '"OK"');
    },

    /*
     IMPLEMENTATIONS OF METHODS
     */
    named_user: function (req, res, next) {
      message.user = hash_id(req.params.userid, 10)
      message.eventName = req.params.eventname
      message.event = req.query
      message.params = req.params
      message.url = req.url
      message.method = req.method
      console.log(message.user + " in " + message.eventName)
      log.debug('named_user: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      await eventsProducer.createEventsHandler(message)
      res.send(200);
      next();
    },

    token_user: function (req, res, next) {
      message.user = hash_id(req._tokendata.userid, 10)
      message.eventName = req.params.eventname
      message.event = req.query
      message.params = req.params
      message.url = req.url
      message.method = req.method
      console.log(message.user + " in " + message.eventName)
      log.debug('token_user: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      await eventsProducer.createEventsHandler(message)
      res.send(200);
      next();
    },

    server_user: function (req, res, next) {
      message.user = hash_id(req.params.servername, 10)
      message.eventName = req.params.eventname
      message.event = req.query
      message.params = req.params
      message.url = req.url
      message.method = req.method
      console.log(message.user + " in " + message.eventName)
      log.debug('server_user: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      await eventsProducer.createEventsHandler(message)
      res.send(200);
      next();
    }
  };
};
