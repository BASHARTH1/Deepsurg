export const environment = {
  production: false,
  /**
   * Web3Forms access key — decides which inbox the contact form lands in.
   * Get one (no account needed) at https://web3forms.com by entering the
   * destination address. Safe to ship in the bundle: it only allows sending to
   * that one address.
   */
  contactFormKey: 'e3d612ae-a214-4bf9-a141-26f912033c11',

  /**
   * Supabase project holding the blog. Both values are public by design — the
   * database enforces who may read drafts and who may publish (supabase/schema.sql).
   * Leave blank and the blog reports itself as unconfigured instead of breaking.
   */
  supabaseUrl: '',
  supabaseAnonKey: '',
};
