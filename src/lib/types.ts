export type MatchType = "exact" | "ean" | "none";

export interface OrderRow {
  order_id: number;
  external_id: string | null;
  tag: string | null;
  status: string | null;
  print_code: string | null;
  client_name: string | null;
  order_created_at: string | null;
  package_created_at: string | null;
  message: string | null;
}

export interface ItemRow {
  id: number;
  order_id: number;
  line_index: number;
  qty: number;
  ean: string | null;
  text: string | null;
  text_key: string | null;
  matched_batch: string | null;
  matched_cislo: number | null;
  matched_filename: string | null;
  matched_storage_path: string | null;
  match_type: MatchType;
  engraved: boolean;
  engraved_at: string | null;
  engraved_by: string | null;
}

export interface OrderDetail extends OrderRow {
  items: ItemRow[];
}
