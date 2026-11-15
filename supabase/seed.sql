-- Optional local development sample data. Never required for production.
insert into public.listings (id,title,author,subject,curriculum,condition,price,original_price,edition,isbn,description,is_demo) values
('00000000-0000-4000-8000-000000000001','Cambridge IGCSE™ Biology','Mary Jones & Geoff Jones','Biology','IGCSE','Like New',45000,125000,'4th edition','9781108936767','Sample listing for local development. Not available to purchase.',true),
('00000000-0000-4000-8000-000000000002','Mathematics: Analysis and Approaches','Paul Fannon et al.','Mathematics','IB','Good',62000,180000,'Standard level','9781108427100','Sample listing for local development. Not available to purchase.',true),
('00000000-0000-4000-8000-000000000003','Cambridge International AS & A Level Economics','Colin Bamford & Susan Grant','Economics','A Level','Good',38000,115000,'4th edition','9781108903417','Sample listing for local development. Not available to purchase.',true),
('00000000-0000-4000-8000-000000000004','Oxford IB Diploma Programme: Chemistry','Sergey Bylikin et al.','Chemistry','IB','Like New',55000,165000,'2023 edition','9780198392125','Sample listing for local development. Not available to purchase.',true),
('00000000-0000-4000-8000-000000000005','Cambridge IGCSE™ Physics','David Sang','Physics','IGCSE','Fair',29000,99000,'3rd edition','9781108888073','Sample listing for local development. Not available to purchase.',true),
('00000000-0000-4000-8000-000000000006','English Language and Literature','Brad Philpot','English','IB','Good',41000,132000,'2nd edition','9781108434812','Sample listing for local development. Not available to purchase.',true)
on conflict (id) do nothing;
