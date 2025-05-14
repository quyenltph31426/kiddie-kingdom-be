import * as CryptoJS from 'crypto-js';
import _ from 'lodash';
import { IPaginationOptions, Pagination } from 'nestjs-typeorm-paginate';
import NodeCache from 'node-cache';

const nodeCache = new NodeCache({ stdTTL: 2, checkperiod: 2 });

export function nowInMillis(): number {
  return Date.now();
}

// Alias for nowInMillis
export function now(): number {
  return nowInMillis();
}

export function nowInSeconds(): number {
  return (nowInMillis() / 1000) | 0;
}

export function addHttps(url: string) {
  if (!/^(?:f|ht)tps?\/\//.test(url)) {
    url = 'https://' + url;
  }
  return url;
}

export function checkIPaginationOptions(options: IPaginationOptions): boolean {
  if (options.limit == 0 || options.page == 0) {
    return false;
  }
  return true;
}

export function encrypt(data: string) {
  return CryptoJS.MD5(data).toString();
}

export function convertToString(value: any) {
  return typeof value === 'string' ? value : '';
}

export function getArrayPagination<T>(
  totalItems: T[],
  options: {
    limit: number;
    page: number;
  },
): Pagination<T> {
  const { limit, page } = options;

  const selectedItems = totalItems.slice((page - 1) * limit, page * limit);
  const pagination = {
    totalItems: totalItems.length,
    itemCount: selectedItems.length,
    itemsPerPage: limit,
    totalPages: Math.ceil(totalItems.length / limit),
    currentPage: page,
  };

  return new Pagination(selectedItems, pagination, null);
}

export function existValueInEnum(type: any, value: any): boolean {
  return (
    Object.keys(type)
      .filter((k) => isNaN(Number(k)))
      .filter((k) => type[k] === value).length > 0
  );
}

export function convertSizeToRank(size: number): string {
  switch (size) {
    case 1:
      return '';
    case 2:
      return 'S';
    case 3:
      return 'SS';
    default:
      throw new Error('Size is not valid');
  }
}

async function web3Cache(key, func) {
  let value = nodeCache.get(key);
  if (value == undefined) {
    // handle miss!
    value = await func;
    nodeCache.set(key, value);
    return value;
  }
  return value;
}

export async function getBlockNumber(chainId, web3) {
  return web3Cache(`${chainId}: getBlockNumber`, web3.eth.getBlockNumber());
}

export function calculateTotal(array, fieldName): number {
  return array.reduce((accumulator, currentValue) => {
    return accumulator + currentValue[fieldName];
  }, 0);
}

export const camelize = (obj) =>
  _.transform(obj, (acc, value, key, target) => {
    const camelKey = _.isArray(target) ? key : _.camelCase(key.toString());

    acc[camelKey] = _.isObject(value) ? (value instanceof Date ? value : camelize(value)) : value;
  });

export function getOffset(paginationOptions: IPaginationOptions) {
  let offset = 0;
  if (paginationOptions.page && paginationOptions.limit) {
    if (Number(paginationOptions.page) > 0) {
      offset = (Number(paginationOptions.page) - 1) * Number(paginationOptions.limit);
    }
  }
  return offset;
}

export function getArrayPaginationBuildTotal<T>(
  selectedItems: T[],
  totalRecords: number,
  options: IPaginationOptions,
): Pagination<T> {
  const { limit, page } = options;

  const pagination = {
    totalItems: Number(totalRecords),
    itemCount: Number(totalRecords),
    itemsPerPage: Number(limit),
    totalPages: Math.ceil(Number(totalRecords) / Number(limit)),
    currentPage: Number(page),
  };

  return new Pagination(selectedItems, pagination, null);
}

export const trimObjectProperties = (obj: NonNullable<unknown>) => {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key].trim();
    }
    if (typeof obj[key] === 'object' && obj[key] instanceof Date === false) {
      trimObjectProperties(obj[key]);
    }
  }
};

export const removeHtmlTags = (inputString: string): string => {
  try {
    // Regular expression to identify HTML tags
    // This matches anything between < and >
    const regex = /<[^>]*>|\r?\n/g;

    // Replace all instances of the matched HTML tags with an empty string
    return inputString.replace(regex, '');
  } catch (e) {
    return '';
  }
};

export const cutTextByLength = (inputString: string, maxLength: number) => {
  try {
    if (inputString.length > maxLength) {
      // Return the substring from 0 to effectiveMaxLength, optionally adding ellipsis
      return inputString.substring(0, maxLength);
    }
    // If the text does not exceed maxLength, return it as is
    return inputString;
  } catch (e) {
    return inputString;
  }
};

export function formatNumber(number: number, decimals = 2): string {
  const roundedNumber = Math.floor(number * Math.pow(10, decimals)) / Math.pow(10, decimals);

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(roundedNumber);
}
