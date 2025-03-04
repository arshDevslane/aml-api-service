import { QueryInterface, DataTypes } from 'sequelize';

const tableName = 'learner';
const columnName = 'preferred_language';

export = {
  /**
   * Write code here for migration.
   *
   * @param queryInterface
   */
  up: async (queryInterface: QueryInterface) => {
    return queryInterface.addColumn(tableName, columnName, {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'en',
    });
  },

  /**
   * Write code here for migration rollback.
   *
   * @param queryInterface
   */
  down: async (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn(tableName, columnName);
  },
};
