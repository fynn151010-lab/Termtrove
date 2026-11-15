export type Book = {
  id: string;
  title: string;
  author: string;
  subject: string;
  curriculum: string;
  condition: string;
  price: number;
  original_price?: number;
  description: string;
  edition: string;
  isbn: string;
  publisher: string;
  seller_id: string;
  seller_name: string;
  status: string;
  is_demo: boolean | number;
  image_id?: string;
  fulfilment: string;
};
export type Profile = {
  id: string;
  display_name: string;
  email: string;
  school: string;
};
