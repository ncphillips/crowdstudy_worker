'use strict';

var _ = require('lodash');

/**
 * Query's the database for workers and adds them to req.workers.
 * @param req
 * @param res
 * @param next
 */
module.exports.query = function (req, res, next) {
  var workers = req.db.collection('workers');
  workers.find(req.query).toArray(function (err, workers) {
    if (err) {
      return next(err);
    }
    req.workers = workers;
    next();
  });
};

/**
 * Query's the database for workers and adds them to req.workers.
 * @param req
 * @param res
 * @param next
 */
module.exports.post_query = function (req, res, next) {
  var workers = req.db.collection('workers');
  workers.find(req.body).toArray(function (err, workers) {
    if (err) {
      return next(err);
    }
    req.workers = workers;
    next();
  });
};

/**
 * If req.workers is empty, a new worker is created with the query
 * parameters, inserted into MongoDB, and added to req.workers.
 * @param req
 * @param res
 * @param next
 */
module.exports.createIfEmpty = function (req, res, next) {
  if (req.workers.length < 1) {
    var worker = req.body;
    worker.experiments = {};

    var workers = req.db.collection('workers');
    workers.insert(worker, function (err, new_workers) {
      req.workers[0] = new_workers[0];
      next();
    });
  } else {
    next();
  }
};



/**
 * Gets the experiment named by `req.experiment_name` and
 * puts it into req.experiment.
 * @param req
 * @param res
 * @param next
 */
module.exports.getExperiment = function (req, res, next) {
  var experiments = Object.getOwnPropertyNames(req.worker.experiments);

  if (experiments.indexOf(req.experiment_name) < 0){
    req.experiment = null;
  } else {
    req.experiment = req.worker.experiments[req.experiment_name];
  }
  next();
};

/**
 * If req.experiment is empty, it sets it to a
 * default object and calls updateExperiment.
 * @param req
 * @param res
 * @param next
 */
module.exports.createExperimentIfEmpty = function (req, res, next) {
  // If there's no experiment, give it a default value.
  if (!req.experiment) {
    req.experiment = {
      consent: null,
      completed: false
    };

    // Check if this experiment has a registration hook.
    var path = ['..', req.experiment_name, 'controllers'].join('/');
    var keys = [];
    var controller = {};

    try {
      controller = require(req.experiment_name).controllers || {};
    }
    catch (E) {
      // Some experiments wills tart with 'crowdstudy_' so let's try that too.
      try {
        controller = require('crowdstudy_' + req.experiment_name).controllers || {};
      } catch (E) {}
    }

    keys = Object.getOwnPropertyNames(controller);

    if (keys.indexOf('hook_worker_registration') >= 0){
      // If it does, call the hook then update the worker.
      controller.hook_worker_registration(req, res, function (err) {
        if (err) {
          return next(err);
        } else {
          updateWorker(req, res, next);
        }
      });
    }
    else {
      // If not, just update the worker.
      updateWorker(req, res, next);
    }
  }
  else {
    next();
  }
};

/**
 * Merges values of req.body into req.worker.
 *
 * @param req
 * @param res
 * @param next
 *
 * @todo Do some validation.
 */
module.exports.mergeWorkerBody = function (req, res, next) {
  _.merge(req.worker, req.body);
  next();
};

/**
 * Merges values of req.body into req.experiment.
 *
 * @param req
 * @param res
 * @param next
 *
 * @todo Do some validation.
 */
module.exports.mergeExperimentBody = function (req, res, next) {
  _.merge(req.experiment, req.body);
  next();
};

/**
 * req.worker is updated in MongoDB
 *
 * @param req
 * @param res
 * @param next
 */
var updateWorker = function (req, res, next) {
  var workers = req.db.collection('workers');
  workers.update({_id: req.worker._id}, req.worker, next);
};
module.exports.updateWorker = updateWorker;


module.exports.markExperimentComplete = function (req, res, next) {
  req.experiment.completed = true;
  req.experiment.code = req.confirmation_code;
  next();
};

/**
 * Puts `req.experiment` into `req.worker`'s experiments, and calls updateWorker.
 *
 * @param req
 * @param res
 * @param next
 */
var updateExperiment = function (req, res, next) {
  req.worker.experiments[req.experiment_name] = req.experiment;
  updateWorker(req, res, next);
};
module.exports.updateExperiment = updateExperiment;

module.exports.returnWorkers = function (req, res) {
  res.json(req.workers);
};

module.exports.returnWorker = function (req, res) {
  res.json(req.worker);
};

module.exports.returnExperiment = function (req, res) {
  console.log(req.experiment);
  res.json(req.experiment);
};

exports.generate_confirmation_code = function (req, res, next) {
  // The mask contains all of the valid characters for the code. A regex for
  // this code would be `^[a-zA-Z0-9]*$`. It would be a good idea to get a
  // better regex so a bit more validation could happen on the Crowdflower end.
  var mask = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  // The result variable will hold the code. One character will be used at a time.
  var result = '';
  for (var length = 16; length > 0; --length) {
    result += mask[Math.round(Math.random() * (mask.length - 1))];
  }

  req.confirmation_code = result;
  next();
};
