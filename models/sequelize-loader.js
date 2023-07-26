'use strict';
const {Sequelize, DataTypes} = require('sequelize');
// 開発環境用DB接続
// const sequelize = new Sequelize(
//   'postgres://postgres:postgres@db/schedule_arranger'
// );

// 本番環境用DB接続
const dialectOptions = {
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
};

// .envにDATABASE_URLがあるかどうかで本番環境用DB接続を行うのか.開発環境用DB接続を行うのかどちらかを選択している
const sequelize = process.env.DATABASE_URL ?
  // 本番環境
  new Sequelize(
    process.env.DATABASE_URL,
    {
      logging: false,
      dialectOptions
    }
  )
  :
  // 開発環境
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
