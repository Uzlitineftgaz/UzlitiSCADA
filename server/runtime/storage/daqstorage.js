/**
 *  Module to manage the DAQ datastore with daqnode 
 */

'use strict';

const fs = require('fs');
const path = require('path');
var DaqNode = require('./daqnode');
var calculator = require('./calculator');

var settings
var logger;
var daqnodes = {};              // list of daqnode

function init(_settings, _log) {
    settings = _settings;
    logger = _log;
    logger.info("daqstorage: init successful!", true);
}

function reset() {
    for (var id in daqnodes) {
        daqnodes[id].close();
    }
    daqnodes = {};
    logger.info("daqstorage reset!", true);
}

function addDaqNode(id, fncgetprop) {
    if (!daqnodes[id]) {
        daqnodes[id] = DaqNode.create(settings, logger, id);
    }
    return daqnodes[id].setCall(fncgetprop);
    // return daqnodes[id].addDaqValue;
}

function getNodeValues(tagid, fromts, tots) {
    return new Promise(function (resolve, reject) {
        var daqnode = _getDaqNode(tagid);
        if (daqnode) {
            resolve(daqnode.getDaqValue(tagid, fromts, tots));
        } else {
            reject();
        }
    });
}

function getNodesValues(tagsid, fromts, tots, options) {
    return new Promise(async function (resolve, reject) {
        try {
            // resolve(['asdf', ...tagsid.map(col => col || '')]);
            var dbfncs = [];
            for (let i = 0; i < tagsid.length; i++) {
                dbfncs.push(getNodeValues(tagsid[i], fromts, tots));
            }
            var result = {};
            await Promise.all(dbfncs).then(values => {
                if (!values || values.length <= 1) {    // (0)[]
                    resolve(['-', ...tagsid.map(col => col || '-')]);
                } else {
                    let calcValues = [];
                    for (let idx = 0 ; idx < values.length; idx++) {
                        if (options.functions[idx]) {
                            calcValues.push(calculator.getMin(values[idx], options.functions[idx], options.interval));
                        } else {
                            calcValues.push(calculator.getMin(values[idx]));
                        }
                    }
                    let mergeValues = Object.keys(calcValues[0]).map(ts => [ts, calcValues[0][ts]]);
                    for (let x = 0; x < calcValues[0].length; x++) {

                    }
                    resolve(calcValues);
                }
            }, reason => {
                reject(reason);
            });
        } catch (err) {
            reject(['ERR', ...tagsid.map(col => 'ERR')]);
        }
    });
}

function _getDaqNode(tagid) {
    var nodes = Object.values(daqnodes);
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].getDaqMap()[tagid]) {
            return nodes[i];
        }
    }
}

module.exports = {
    init: init,
    reset: reset,
    addDaqNode: addDaqNode,
    getNodeValues: getNodeValues,
    getNodesValues: getNodesValues
};