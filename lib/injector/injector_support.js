// Generated by CoffeeScript 1.4.0
var Inflection, fs, support, wrench;

Inflection = require('inflection');

wrench = require('wrench');

fs = require('fs');

if (typeof fing === 'undefined') {
  require('fing');
}

module.exports = support = {
  fn2modules: function(fn) {
    var arg, funcStr, module, modules, _i, _len, _ref;
    modules = [];
    funcStr = fn.toString();
    _ref = fn.fing.args;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      arg = _ref[_i];
      module = arg.name;
      if (module.match(/^_arg/)) {
        if (funcStr.match(/_ref = _arg/)) {
          support.mixedDepth(modules, funcStr);
        } else {
          support.uniformDepth(modules, funcStr);
        }
      } else {
        modules.push({
          module: arg.name
        });
      }
    }
    return modules;
  },
  mixedDepth: function(modules, funcStr) {
    throw new Error('Mixed depth focussed injection not yet supported');
  },
  uniformDepth: function(modules, funcStr) {
    var chain, narg, nestings, ref, targetArg, _i, _len, _ref;
    nestings = {};
    _ref = funcStr.match(/_(arg|ref)\.(\w*)/g);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      narg = _ref[_i];
      chain = narg.split('.');
      ref = chain.shift();
      targetArg = funcStr.match(new RegExp("(\\w*) = _arg." + chain[0]))[1];
      if (chain[chain.length - 1] !== targetArg) {
        chain.push(targetArg);
      }
      nestings[targetArg] = chain;
    }
    return modules.push({
      _nested: nestings
    });
  },
  loadServices: function(dynamic, preDefined) {
    var config, module, services, skip, _i, _len;
    if (preDefined == null) {
      preDefined = [];
    }
    skip = preDefined.length;
    services = preDefined;
    for (_i = 0, _len = dynamic.length; _i < _len; _i++) {
      config = dynamic[_i];
      if (skip-- > 0) {
        continue;
      }
      if (config._nested) {
        support.loadNested(services, config._nested);
        continue;
      }
      if (config.module.match(/^[A-Z]/)) {
        services.push(support.findModule(config));
      } else {
        module = require(config.module);
        services.push(module);
      }
    }
    return services;
  },
  loadNested: function(services, config) {
    var defn, existing, name, nextService, rebuild, _arg, _i, _len, _results;
    services.push({});
    _arg = services[services.length - 1];
    _results = [];
    for (name in config) {
      defn = config[name];
      rebuild = [];
      for (_i = 0, _len = services.length; _i < _len; _i++) {
        existing = services[_i];
        rebuild.push(existing);
      }
      rebuild.push({
        module: defn[0]
      });
      support.loadServices(rebuild, services);
      nextService = services.pop();
      if (defn.length > 1) {
        _results.push(_arg[defn[0]] = nextService[name]);
      } else {
        _results.push(_arg[name] = nextService);
      }
    }
    return _results;
  },
  findModule: function(config) {
    var call, match, modulePath, name, path, previous, stack, _i, _len;
    name = Inflection.underscore(config.module);
    stack = fing.trace();
    previous = null;
    for (_i = 0, _len = stack.length; _i < _len; _i++) {
      call = stack[_i];
      if (call.file.match(/injector_support.js$/)) {
        continue;
      }
      if (match = call.file.match(/(.*)\/spec\/.*/)) {
        path = match[1];
        modulePath = support.getModulePath(name, path, ['lib', 'app', 'bin']);
        if (modulePath) {
          return require(modulePath);
        }
        throw new Error("Injector failed to locate " + name + ".js in " + path);
      } else if (call.file === 'module.js') {
        if (match = previous.match(/(.*)\/(lib|app|bin)\//)) {
          path = match[1];
          modulePath = support.getModulePath(name, match[1], [match[2]]);
          if (modulePath) {
            return require(modulePath);
          }
          throw new Error("Injector failed to locate " + name + ".js in " + path);
        }
        continue;
      }
      previous = call.file;
    }
    throw new Error("Injector failed to locate " + name + ".js");
  },
  getModulePath: function(name, root, search) {
    var dir, expression, file, match, searchPath, source, _i, _j, _len, _len1, _ref;
    expression = "(.*" + name + ")\\.(coffee|js)$";
    for (_i = 0, _len = search.length; _i < _len; _i++) {
      dir = search[_i];
      source = null;
      searchPath = root + ("/" + dir);
      if (fs.existsSync(searchPath)) {
        _ref = wrench.readdirSyncRecursive(searchPath);
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          file = _ref[_j];
          if (match = file.match(new RegExp(expression))) {
            if (match[1].split('/').pop() !== name) {
              continue;
            }
            if (source) {
              throw new Error("Found more than 1 source for module '" + name + "'");
            } else {
              source = "" + searchPath + "/" + match[1];
            }
          }
        }
      }
      return source;
    }
  }
};
