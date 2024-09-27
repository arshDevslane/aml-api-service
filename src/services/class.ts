import _ from 'lodash';
import { Status } from '../enums/status';
import { classMaster } from '../models/classMaster';
import { amlError } from '../types/amlError';

// Update a single class
export const updateClassData = async (identifier: string, req: any): Promise<any> => {
  const existingClass = await classMaster.findOne({
    where: { identifier, is_active: true, status: Status.LIVE },
    raw: true,
  });

  if (!existingClass) {
    const code = 'CLASS_NOT_FOUND';
    throw amlError(code, 'Class not found.', 'NOT_FOUND', 404);
  }

  const updatedData = {
    ...existingClass,
    ...req,
  };

  await classMaster.update(updatedData, {
    where: { identifier },
  });

  return updatedData;
};

// Get class by identifier
export const getClassById = async (class_id: string): Promise<any> => {
  const classData = await classMaster.findOne({
    where: { identifier: class_id, is_active: true, status: Status.LIVE },
    attributes: { exclude: ['id'] },
  });
  return { classData };
};

// check class by id
export const getClassIds = async (classIds: number[]): Promise<any> => {
  const classDataIds = await classMaster.findAll({
    where: { id: classIds, status: Status.LIVE, is_active: true },
    raw: true,
  });
  return classDataIds;
};

export const checkClassIdsExists = async (classIds: number[]): Promise<boolean> => {
  const existingClassRecords = await getClassIds(classIds);

  const existingClassIds = _.map(existingClassRecords, 'id'); // Extract only the IDs from the existing records

  // Use Lodash to check if the arrays have the same elements (i.e., no missing IDs)
  const missingClassIds = _.difference(classIds, existingClassIds);

  // If there are no missing IDs, return true, else return false
  return _.isEmpty(missingClassIds);
};
