import { QueryInterface } from 'sequelize';

const tableName = 'learner_sessions';
const oldColumnName = 'expire';
const newColumnName = 'expires';

export = {
  /**
   * Write code here for migration.
   *
   * @param queryInterface
   */
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.renameColumn(tableName, oldColumnName, newColumnName);
  },

  /**
   * Write code here for migration rollback.
   *
   * @param queryInterface
   */
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.renameColumn(tableName, newColumnName, oldColumnName);
  },
};
