import bcrypt from 'bcryptjs';

export const USER_STATUS = ['active', 'inactive', 'suspended'];
export const USER_ROLES = ['super_admin', 'admin'];
export const JEWELRY_CATEGORIES = ['rings', 'necklaces', 'bracelets', 'earrings', 'watches', 'other'];
export const JEWELRY_MATERIALS = ['gold', 'silver', 'diamond'];
export const JEWELRY_STATUSES = ['available', 'reserved', 'sold', 'out_of_stock'];

export function normalizeUsername(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 30);
}

export function buildManagedLoginEmail(username) {
  return `${normalizeUsername(username)}@users.local`;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function mapUserRow(row) {
  return {
    id: String(row.id),
    email: row.email,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    mustChangePassword: Boolean(row.must_change_password),
    companyId: row.company_id ? String(row.company_id) : null,
  };
}

export function mapProfileRow(row) {
  return {
    id: String(row.id),
    full_name: row.full_name,
    phone: row.phone ?? '',
    status: row.status,
    must_change_password: Boolean(row.must_change_password),
    failed_login_attempts: row.failed_login_attempts ?? 0,
    locked_until: row.locked_until,
    business_name: row.business_name ?? '',
    address: row.address ?? '',
    logo: row.logo ?? '',
    secondary_phone: row.secondary_phone ?? '',
    created_at: row.created_at,
  };
}

export function mapClientRow(row) {
  return {
    id: String(row.id),
    code: row.code,
    name: row.name,
    phone: row.phone ?? '',
    email: row.email,
    balance: Number(row.balance ?? 0),
    created_at: row.created_at,
    created_by: row.created_by ? String(row.created_by) : null,
  };
}

export function mapJewelryRow(row) {
  return {
    id: String(row.id),
    code: row.code,
    material_type: row.material_type,
    name: row.name,
    category: row.category,
    weight: Number(row.weight ?? 0),
    price_per_gram: Number(row.price_per_gram ?? 0),
    purchase_price: Number(row.purchase_price ?? 0),
    sale_price: Number(row.sale_price ?? 0),
    quantity: Number(row.quantity ?? 0),
    status: row.status,
    photo: row.photo,
    created_at: row.created_at,
    created_by: row.created_by ? String(row.created_by) : null,
  };
}

export function mapDepositRow(row) {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    amount: Number(row.amount ?? 0),
    document_number: row.document_number,
    note: row.note,
    created_at: row.created_at,
    created_by: row.created_by ? String(row.created_by) : null,
    clients: row.client_name
      ? {
          name: row.client_name,
          code: row.client_code,
        }
      : null,
  };
}

export function mapSaleRow(row) {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    jewelry_id: row.jewelry_id ? String(row.jewelry_id) : null,
    document_number: row.document_number,
    total_price: Number(row.total_price ?? 0),
    paid_from_balance: Number(row.paid_from_balance ?? 0),
    paid_amount: Number(row.paid_amount ?? row.paid_cash ?? 0),
    payment_method: row.payment_method ?? 'Espèces',
    paid_cash: Number(row.paid_cash ?? 0),
    paid_mobile_money: Number(row.paid_mobile_money ?? 0),
    paid_card: Number(row.paid_card ?? 0),
    paid_other: Number(row.paid_other ?? 0),
    remaining_amount: Number(row.remaining_amount ?? 0),
    change_amount: Number(row.change_amount ?? 0),
    change_to_balance: Number(row.change_to_balance ?? 0),
    created_at: row.created_at,
    created_by: row.created_by ? String(row.created_by) : null,
    clients: row.client_name ? { name: row.client_name, code: row.client_code } : null,
    jewelry: row.jewelry_name ? { name: row.jewelry_name } : null,
    items: row.items ?? [],
  };
}

export function mapSaleItemRow(row) {
  return {
    id: String(row.id),
    sale_id: String(row.sale_id),
    jewelry_id: String(row.jewelry_id),
    jewelry_code: row.jewelry_code,
    jewelry_name: row.jewelry_name,
    material_type: row.material_type,
    weight: Number(row.weight ?? 0),
    price_per_gram: Number(row.price_per_gram ?? 0),
    quantity: Number(row.quantity ?? 0),
    line_total: Number(row.line_total ?? 0),
  };
}

export function mapReservationRow(row) {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    jewelry_id: String(row.jewelry_id),
    document_number: row.document_number,
    deposit_amount: Number(row.deposit_amount ?? 0),
    remaining_amount: Number(row.remaining_amount ?? 0),
    created_at: row.created_at,
    created_by: row.created_by ? String(row.created_by) : null,
    clients: row.client_name ? { name: row.client_name, code: row.client_code } : null,
    jewelry: row.jewelry_name ? { name: row.jewelry_name } : null,
  };
}

export function mapWalletTransactionRow(row) {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    operation_type: row.operation_type,
    operation_id: row.operation_id ? String(row.operation_id) : null,
    document_number: row.document_number,
    amount: Number(row.amount ?? 0),
    balance_before: Number(row.balance_before ?? 0),
    balance_after: Number(row.balance_after ?? 0),
    created_at: row.created_at,
    created_by: row.created_by ? String(row.created_by) : null,
    clients: row.client_name
      ? {
          name: row.client_name,
          code: row.client_code,
        }
      : null,
  };
}
