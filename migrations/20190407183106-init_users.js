module.exports = {
  up(db) {
     return db.createCollection('users');
  },

  down(db) {
     return db.users.drop();
  }
};
