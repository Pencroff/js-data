var observe = require('../../../lib/observe-js/observe-js');
var DSUtils = require('../../utils');
var DSErrors = require('../../errors');

function changes(resourceName, id) {
  var definition = this.definitions[resourceName];

  id = DSUtils.resolveId(definition, id);
  if (!definition) {
    throw new DSErrors.NER(resourceName);
  } else if (!DSUtils.isString(id) && !DSUtils.isNumber(id)) {
    throw new DSErrors.IA('"id" must be a string or a number!');
  }

  var item = this.get(resourceName, id);
  if (item) {
    this.store[resourceName].observers[id].deliver();
    var diff = DSUtils.diffObjectFromOldObject(item, this.store[resourceName].previousAttributes[id]);
    DSUtils.forOwn(diff, function (changeset, name) {
      var toKeep = [];
      DSUtils.forOwn(changeset, function (value, field) {
        if (!DSUtils.isFunction(value)) {
          toKeep.push(field);
        }
      });
      diff[name] = DSUtils.pick(diff[name], toKeep);
    });
    DSUtils.forEach(definition.relationFields, function (field) {
      delete diff.added[field];
      delete diff.removed[field];
      delete diff.changed[field];
    });
    return diff;
  }
}

function changeHistory(resourceName, id) {
  var definition = this.definitions[resourceName];
  var resource = this.store[resourceName];

  id = DSUtils.resolveId(definition, id);
  if (resourceName && !this.definitions[resourceName]) {
    throw new DSErrors.NER(resourceName);
  } else if (id && !DSUtils.isString(id) && !DSUtils.isNumber(id)) {
    throw new DSErrors.IA('"id" must be a string or a number!');
  }

  if (!definition.keepChangeHistory) {
    console.warn('changeHistory is disabled for this resource!');
  } else {
    if (resourceName) {
      var item = this.get(resourceName, id);
      if (item) {
        return resource.changeHistories[id];
      }
    } else {
      return resource.changeHistory;
    }
  }
}

function createInstance(resourceName, attrs, options) {
  var definition = this.definitions[resourceName];

  attrs = attrs || {};
  options = options || {};

  if (!definition) {
    throw new DSErrors.NER(resourceName);
  } else if (attrs && !DSUtils.isObject(attrs)) {
    throw new DSErrors.IA('"attrs" must be an object!');
  } else if (!DSUtils.isObject(options)) {
    throw new DSErrors.IA('"options" must be an object!');
  }

  if (!('useClass' in options)) {
    options.useClass = definition.useClass;
  }

  var item;

  if (options.useClass) {
    var Constructor = definition[definition.class];
    item = new Constructor();
  } else {
    item = {};
  }
  return DSUtils.deepMixIn(item, attrs);
}

function diffIsEmpty(diff) {
  return !(DSUtils.isEmpty(diff.added) &&
    DSUtils.isEmpty(diff.removed) &&
    DSUtils.isEmpty(diff.changed));
}

function digest() {
  observe.Platform.performMicrotaskCheckpoint();
}

function compute(resourceName, instance) {
  var definition = this.definitions[resourceName];

  instance = DSUtils.resolveItem(this.store[resourceName], instance);
  if (!definition) {
    throw new DSErrors.NER(resourceName);
  } else if (!DSUtils.isObject(instance) && !DSUtils.isString(instance) && !DSUtils.isNumber(instance)) {
    throw new DSErrors.IA('"instance" must be an object, string or number!');
  }

  if (DSUtils.isString(instance) || DSUtils.isNumber(instance)) {
    instance = this.get(resourceName, instance);
  }

  DSUtils.forOwn(definition.computed, function (fn, field) {
    DSUtils.compute.call(instance, fn, field, DSUtils);
  });

  return instance;
}

function get(resourceName, id, options) {
  options = options || {};

  if (!this.definitions[resourceName]) {
    throw new DSErrors.NER(resourceName);
  } else if (!DSUtils.isString(id) && !DSUtils.isNumber(id)) {
    throw new DSErrors.IA('"id" must be a string or a number!');
  } else if (!DSUtils.isObject(options)) {
    throw new DSErrors.IA('"options" must be an object!');
  }
  // cache miss, request resource from server
  var item = this.store[resourceName].index[id];
  if (!item && options.loadFromServer) {
    this.find(resourceName, id, options);
  }

  // return resource from cache
  return item;
}

function hasChanges(resourceName, id) {
  id = DSUtils.resolveId(this.definitions[resourceName], id);
  if (!this.definitions[resourceName]) {
    throw new DSErrors.NER(resourceName);
  }

  // return resource from cache
  if (this.get(resourceName, id)) {
    return diffIsEmpty(this.changes(resourceName, id));
  } else {
    return false;
  }
}

function lastModified(resourceName, id) {
  var definition = this.definitions[resourceName];
  var resource = this.store[resourceName];

  id = DSUtils.resolveId(definition, id);
  if (!definition) {
    throw new DSErrors.NER(resourceName);
  }
  if (id) {
    if (!(id in resource.modified)) {
      resource.modified[id] = 0;
    }
    return resource.modified[id];
  }
  return resource.collectionModified;
}

function lastSaved(resourceName, id) {
  var definition = this.definitions[resourceName];
  var resource = this.store[resourceName];

  id = DSUtils.resolveId(definition, id);
  if (!definition) {
    throw new DSErrors.NER(resourceName);
  }
  if (!(id in resource.saved)) {
    resource.saved[id] = 0;
  }
  return resource.saved[id];
}

module.exports = {
  changes: changes,
  changeHistory: changeHistory,
  compute: compute,
  createInstance: createInstance,
  defineResource: require('./defineResource'),
  digest: digest,
  eject: require('./eject'),
  ejectAll: require('./ejectAll'),
  filter: require('./filter'),
  get: get,
  hasChanges: hasChanges,
  inject: require('./inject'),
  lastModified: lastModified,
  lastSaved: lastSaved,
  link: require('./link'),
  linkAll: require('./linkAll'),
  linkInverse: require('./linkInverse'),
  previous: require('./previous'),
  unlinkInverse: require('./unlinkInverse')
};
