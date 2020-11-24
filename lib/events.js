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

const { Kafka, logLevel } = require('kafkajs')
var amoeba = require('amoeba');
var config = require('amoeba/lib/config')

module.exports = function (config, eventsLogger) {

    function assertConfigValid(config) {
        if (config == null) {
          throw new Error('Config is not set');
        }
        if (!config.brokers || !config.brokers.length) {
          throw new Error('Brokers is not set');
        }
        if (!config.cloudEventsSource) {
          throw new Error('Cloud events source is not set');
        }
        if (!config.consumerGroup) {
          throw new Error('Consumer group is not set');
        }
        if (!config.topic) {
          throw new Error('Topic is not set');
        }
    }
    
    function getLogLevel(config) {
        const level = logLevel[config.clientLogLevel];
        return level || logLevel.ERROR;
    }
    
    const opts = {
        clientId: config.cloudEventsSource,
        brokers: config.brokers,
        logLevel: getLogLevel(config),
        ssl: config.requireSSL,
    };
    if (config.username != null && config.password != null) {
        opts.sasl = {
            mechanism: 'scram-sha-512',
            username: config.username,
            password: config.password,
        };
    }

    const kafka = new Kafka(opts);
    const producer = kafka.producer()
    return {
        createEventsHandler: function (event) {
            const now = new Date()
            const run = async () => {
                assertConfigValid(config)
                await producer.connect().catch(console.error)
                await producer.send({
                    topic: config.topic,
                    messages: [
                        {value: JSON.stringify(event)},
                    ],
                }).then(console.log(now + " Kafka Message sent: " + JSON.stringify(event)))
            }
            run().catch(console.error)
        }
    }
}