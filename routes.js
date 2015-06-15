'use strict';
var worker = require('../../lib/middleware/worker');
var controllers = require('./controllers');

/**
 * Adds new routes to the application passed in.
 * @param app
 */
module.exports = function (app) {
  /**
   * List Workers
   */
  app.get('/',
    controllers.query,
    controllers.returnWorkers
  );

  /**
   * Get or Create by id and platform.
   *
   * req.body = {
   *   id: 12345,
   *   platform: 'mturk'
   * };
   */
  app.post('/',
    controllers.post_query,
    controllers.createIfEmpty,
    controllers.returnWorkers
  );

  /**
   * Get by _id
   */
  app.get('/:id',
    controllers.returnWorker
  );

  app.post('/:id',
    controllers.mergeWorkerBody,
    controllers.updateWorker,
    controllers.returnWorker
  );

  /**
   * Get or Create Experiment Record for Worker.
   */
  app.get('/:id/experiments/:experiment_name',
    controllers.getExperiment,
    controllers.createExperimentIfEmpty,
    controllers.returnExperiment
  );

  /**
   * Update Experiment Record.
   */
  app.post('/:id/experiments/:experiment_name',
    controllers.getExperiment,
    controllers.createExperimentIfEmpty,
    controllers.mergeExperimentBody,
    controllers.updateExperiment,
    controllers.returnExperiment
  );

  app.get('/:id/experiments/:experiment_name/mark_complete',
    controllers.getExperiment,
    controllers.generate_confirmation_code,
    controllers.markExperimentComplete,
    controllers.updateExperiment,
    controllers.returnExperiment
  );

  app.param('id', function (req, res, next, id) {
    var ObjectId = require('mongodb').ObjectID;
    var workers = req.db.collection('workers');
    workers.find({_id: ObjectId(id)}).toArray(function (err, workers) {
      if (err) return next(err);

      log.info(workers);
      if (workers.length < 1) return next(new Error('Failed to load Worker.'));

      req.worker = workers[0];
      next();
    });
  });

  app.param('experiment_name', function (req, res, next, experiment_name) {
    req.experiment_name = experiment_name;
    next();
  });
};


