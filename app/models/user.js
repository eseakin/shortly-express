var db = require('../config');
var Click = require('./click');
var crypto = require('crypto');

var User = db.Model.extend({
  tableName: 'users',
  
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      // model.set()
    });
  }
});

module.exports = User;
