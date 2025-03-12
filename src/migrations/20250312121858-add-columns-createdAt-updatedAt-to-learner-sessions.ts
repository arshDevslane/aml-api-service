import { QueryInterface, DataTypes } from 'sequelize';

const tableName = 'learner_sessions';
const columnNames = ['createdAt', 'updatedAt'];

export = {
  /**
   * Write code here for migration.
   *
   * @param queryInterface
   */
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn(tableName, columnNames[0], {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: new Date(),
    });
    await queryInterface.addColumn(tableName, columnNames[1], {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: new Date(),
    });
  },

  /**
   * Write code here for migration rollback.
   *
   * @param queryInterface
   */
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn(tableName, columnNames[0]);
    await queryInterface.removeColumn(tableName, columnNames[1]);
  },
};
