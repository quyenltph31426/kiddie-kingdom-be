export enum HotWalletStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum Currency {
  BIV = 'biv',
  WBIV = 'wbiv',
  ETH = 'eth',
}

export enum WEBHOOK_TYPE {
  TRANSFER = 'transfer',
  TXCHANGED = 'tx_changed',
  COMMON = 'common',
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL_NORMAL = 'withdrawal_normal',
  WITHDRAWAL_COLD = 'withdrawal_cold',
  SEED = 'seed',
  COLLECT = 'collect',
  WITHDRAWAL_COLLECT = 'withdrawal_collect',
}

export enum WithdrawalStatus {
  INVALID = 'invalid',
  UNSIGNED = 'unsigned',
  SIGNING = 'signing',
  SIGNED = 'signed',
  SENT = 'sent',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PendingWithdrawalStatus {
  UNSIGNED = 'unsigned',
  SIGNING = 'signing',
  SIGNED = 'signed',
  SENT = 'sent',
}

export enum WithdrawOutType {
  WITHDRAW_OUT_COLD_SUFFIX = '_cold_withdrawal',
  WITHDRAW_OUT_NORMAL = 'normal',
  EXPLICIT_FROM_HOT_WALLET = 'explicit_from_hot_wallet',
  EXPLICIT_FROM_DEPOSIT_ADDRESS = 'explicit_from_deposit_address',
  AUTO_COLLECTED_FROM_DEPOSIT_ADDRESS = 'auto_collected_from_deposit_address',
}

export enum WalletEvent {
  CREATED = 'created',
  DEPOSIT = 'deposit',
  WITHDRAW_REQUEST = 'withdraw_request',
  WITHDRAW_COMPLETED = 'withdraw_completed',
  WITHDRAW_FAILED = 'withdraw_failed',
  WITHDRAW_FEE = 'withdraw_fee',
  WITHDRAW_ACCEPTED = 'withdraw_accepted',
  WITHDRAW_DECLINED = 'withdraw_declined',
  COLLECT_FEE = 'collect_fee',
  COLLECT_AMOUNT = 'collect_amount',
  COLLECTED_FAIL = 'collected_fail',
  COLLECTED = 'collected',
  SEEDED_FAIL = 'seeded_fail',
  SEEDED = 'seeded',
  SEED_FEE = 'seed_fee',
  SEED_AMOUNT = 'seed_amount',
}

export enum CollectStatus {
  UNCOLLECTED = 'uncollected',
  COLLECTING_FORWARDING = 'forwarding',
  COLLECTING = 'collecting',
  COLLECT_SIGNED = 'collect_signed',
  COLLECT_SENT = 'collect_sent',
  COLLECTED = 'collected',
  NOTCOLLECT = 'notcollect',
  SEED_REQUESTED = 'seed_requested',
  SEEDING = 'seeding',
  SEED_SIGNED = 'seed_signed',
  SEED_SENT = 'seed_sent',
  SEEDED = 'seeded',
}

export enum HotWalletType {
  NORMAL = 'normal',
  SEED = 'seed',
}

export enum SortBy {
  UPDATED_AT = 'updatedAt',
  AMOUNT = 'amount',
}

export enum SortType {
  SortTypeASC = 'asc',
  SortTypeDESC = 'desc',
}

export const TYPE = [
  'Glacier',
  'Plains',
  'Desert',
  'Mountain',
  'Volcano',
  'Ruins',
  'Forest',
  'Shore',
  'Cave',
  'Village',
  'Swamp',
  'Castle',
];

export const RANK = ['', 'S', 'SS'];

export const RARITY = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythical'];

export const UR = ['', 'Ultra Rare'];

export enum Blockchain {
  EVM = 'EVM',
  CARDANO = 'CARDANO',
}

export enum OnchainStatus {
  CONFIRMING = 'confirming',
  CONFIRMED = 'confirmed',
}
export enum AdminRoles {
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum AdminStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const UserGender = {
  FEMALE: 'Female',
  MALE: 'Male',
  UNSPECIFIED: 'Unspecified',
};

export const OrderStatus = {
  TO_PAY: 'TO_PAY',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
  REFUND: 'REFUND',
  EXPIRED: 'EXPIRED',
};

export const DemographicAgeGroups = {
  UNDER_18: 'Under 18',
  BETWEEN_18_24: '18-24 Years Old',
  BETWEEN_25_34: '25-34 Years Old',
  BETWEEN_35_44: '35-44 Years Old',
  BETWEEN_45_54: '45-54 Years Old',
  MORE_THAN_OR_EQUAL_55: '55 Years+',
};

export enum TicketPricingType {
  FREE = 'Free',
  PAID = 'Paid',
}

export enum TicketStatus {
  UPCOMING = 'Upcoming',
  ONGOING = 'Ongoing',
  EXPIRED = 'Expired',
  SOLD_OUT = 'Out of stock',
  NOT_SELLING = 'Not selling',
  SELLING = 'Selling',
}

export enum SkillLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
  EXPERT = 'Expert',
}

export enum ReferenceDocumentType {
  COURSE = 'COURSE',
  EXAM = 'EXAM',
  CERTIFICATE = 'CERTIFICATE',
  ACADEMY = 'ACADEMY',
  TEACHER = 'TEACHER',
}

export enum DocumentType {
  TEMPLATE = 'TEMPLATE',
  AVATAR = 'AVATAR',
  DOCUMENT = 'DOCUMENT',
  BACKGROUND = 'BACKGROUND',
}

export const CourseAndExamStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
};

export const TeacherStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
};

export enum CourseEditorStatus {
  PREVIEW = 'PREVIEW',
  PUBLISH = 'PUBLISH',
}
export enum Language {
  ENGLISH = 'ENG',
  THAILAND = 'THA',
}

export const BankAccountStatus = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const MintStatus = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  MINTING: 'Minting',
  COMPLETED: 'Completed',
  FAIL: 'Fail',
};

export const StudentRecordImportedBy = {
  API: 'API',
  CSV: 'CSV',
  MANUAL: 'MANUAL',
};

export enum PAYMENT_METHOD {
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  ONLINE_PAYMENT = 'ONLINE_PAYMENT',
}

export enum ACADEMY_TYPE {
  INSTITUTIONS = 'INSTITUTIONS',
  INDEPENDENT_EDUCATOR = 'INDEPENDENT_EDUCATOR',
  PERSONAL_TRAINERS = 'PERSONAL_TRAINERS',
  CONTENT_CREATOR = 'CONTENT_CREATOR',
}

export enum ACADEMY_INSTITUTIONS_TYPE {
  PRIMARY_EDUCATIONAL = 'PRIMARY_EDUCATIONAL',
  SECONDARY_EDUCATION = 'SECONDARY_EDUCATION',
  TERTIARY_EDUCATION = 'TERTIARY_EDUCATION',
  VOCATIONAL_EDUCATION = 'VOCATIONAL_EDUCATION',
}

export const SecurityTokenStatus = {
  AVAILABLE: 'AVAILABLE',
  REVOKED: 'REVOKED',
};

export enum CourseOrderStatus {
  TOPAY = 'TO_PAY',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  REFUND = 'REFUND',
  EXPIRED = 'EXPIRED',
}

export const CourseType = {
  COURSE: 'COURSE',
  EXAM: 'EXAM',
};

export const CourseLocationType = {
  VENUE: 'Venue',
  ONLINE: 'Online',
};

export const VenueLocation = {
  ADD_LOCATION: 'ADD_LOCATION',
  TO_BE_ANNOUNCED: 'TO_BE_ANNOUNCED',
};

export const CourseDateAndTimeType = {
  SPECIFIC_DATE: 'SPECIFIC_DATE',
  TO_BE_ANNOUNCED: 'TO_BE_ANNOUNCED',
};

export const TxnType = {
  BUY_TICKET: 'BUY_TICKET',
};

export const PaymentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
};

export const ShippingStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELED: 'CANCELED',
};
