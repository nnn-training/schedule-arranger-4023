'use strict';
const {Sequelize, DataTypes} = require('sequelize');

const dialectOptions = {
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
};

const sequelize = process.env.DATABASE_URL ?
  // release
  new Sequelize(
    process.env.DATABASE_URL,
    {
      logging: false,
      dialectOptions
    }
  )
  :
  // development
  new Sequelize(
  'postgres://postgres:postgres@db/schedule_arranger',
  {
    logging: false
  }
);

module.exports = {
  sequelize,
  DataTypes
};
