'use strict';

/**
 * Module dependencies.
 */

var integration = require('@segment/analytics.js-integration');

/**
 * Expose `Dashly` integration.
 */

var Dashly = (module.exports = integration('Dashly')
  .assumesPageview()
  .global('dashly')
  .global('dashlyasync')
  .option('apiKey', null)
  .tag('<script src="//cdn.dashly.app/api.min.js"></script>'));

/**
 * Initialize.
 *
 * https://dashly.io/developers/tuning/install/
 *
 * @api public
 */

Dashly.prototype.initialize = function() {
  var apiKey = this.options.apiKey;

  window.dashly = {};
  window.dashlyasync = [];

  var m = [
    'addCallback',
    'auth',
    'connect',
    'identify',
    'onReady',
    'open',
    'removeCallback',
    'track',
    'trackMessageInteraction'
  ];

  for (var i = 0; i < m.length; i++) {
    window.dashly[m[i]] = Build(m[i]);
  }

  window.dashly.connect(apiKey);

  this.load(this.ready);

  function Build(name) {
    return function() {
      window.dashlyasync.push(name, arguments);
    };
  }
};

/**
 * Loaded?
 *
 * @api private
 * @return {boolean}
 */

Dashly.prototype.loaded = function() {
  return !!(window.dashly && window.dashly.connected);
};

/**
 * Identify.
 *
 * @api public
 * @param {Identify} identifyFacade
 */

Dashly.prototype.identify = function(identifyFacade) {
  var dashlySettings = identifyFacade.options(this.name);
  var traits = Dashly.formatTraits(identifyFacade);
  var userId = identifyFacade.userId();

  if (dashlySettings.user_hash) {
    dashlySettings.userHash = dashlySettings.user_hash;
  }

  if (userId && dashlySettings.userHash && !this.authorized) {
    window.dashly.auth(userId, dashlySettings.userHash);
    this.authorized = true;
  }
  window.dashly.identify(traits);
};

/**
 * Track.
 *
 * @api public
 * @param {Track} trackFacade
 */

Dashly.prototype.track = function(trackFacade) {
  var event = Dashly.formatEvent(trackFacade);

  window.dashly.track(event.name, event.properties);
};

/**
 * Format some Segment events to Dashly standard events
 * Exported for testing
 *
 * https://dashly.io/developers/events/
 *
 * @param {Track} trackFacade
 * @returns {Object} formatted event
 */

module.exports.formatEvent = function(trackFacade) {
  var eventName = trackFacade.event();
  var aliases;
  var properties;

  switch (eventName) {
    case 'Order Completed':
      aliases = {
        order_id: '$order_id',
        total: '$order_amount'
      };

      eventName = '$order_completed';
      properties = trackFacade.properties(aliases);
      break;
    case 'Product Viewed':
      aliases = {
        image_url: '$img',
        name: '$name',
        price: '$amount',
        url: '$url'
      };

      eventName = '$product_viewed';
      properties = trackFacade.properties(aliases);
      break;
    case 'Product Added':
      aliases = {
        image_url: '$img',
        name: '$name',
        price: '$amount',
        url: '$url'
      };

      eventName = '$cart_added';
      properties = trackFacade.properties(aliases);
      break;
    case 'Signed In':
      aliases = {
        username: '$name'
      };

      eventName = '$authorized';
      properties = trackFacade.properties(aliases);
      break;
    case 'Signed Up':
      aliases = {
        email: '$email',
        username: '$name'
      };

      eventName = '$registered';
      properties = trackFacade.properties(aliases);
      break;
    default:
      properties = trackFacade.properties();
      break;
  }

  return {
    name: eventName,
    properties: properties
  };
};

/**
 * Format some Segment traits to Dashly standard properties
 * Exported for testing
 *
 * https://dashly.io/developers/props/
 *
 * @param identifyFacade
 * @returns {Object} formatted traits
 */

module.exports.formatTraits = function(identifyFacade) {
  var aliases = {
    // standard traits names can be in camelCase or in _underscore, so rename them in _underscore
    createdAt: 'created_at',
    firstName: 'first_name',
    lastName: 'last_name',

    // rename id trait
    id: 'segment_id',

    // rename other traits names to Dashly standard properties names
    email: '$email',
    name: '$name',
    phone: '$phone'
  };

  var traits = identifyFacade.traits(aliases);

  // format name like Segment does it
  // first_name and last_name are ignored when name exists
  if (traits.first_name || traits.last_name) {
    if (!traits.$name) {
      traits.$name = [traits.first_name, traits.last_name].join(' ').trim();
    }

    delete traits.first_name;
    delete traits.last_name;
  }

  return traits;
};
