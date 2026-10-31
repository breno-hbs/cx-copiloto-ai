-- Pedidos fictícios, um por cenário. Datas fixas em 2026-10-31 (horário UTC).
insert into orders (id, persona_name, status, restaurant, items, total, placed_at, eta, delivered_at, payment_charges, refund_status) values
('PED-1001','Ana Souza (fictícia)','out_for_delivery','Lanchonete Exemplo',
  '[{"name":"X-Burger","qty":2,"price":28.00},{"name":"Refrigerante","qty":2,"price":6.00}]', 68.00,
  '2026-10-30T21:00:00Z','2026-10-30T21:45:00Z', null,
  '[{"amount":68.00,"at":"2026-10-30T21:00:00Z"}]','none'),
('PED-1002','Bruno Lima (fictício)','cancelled','Pizzaria Modelo',
  '[{"name":"Pizza Calabresa","qty":1,"price":54.90}]', 54.90,
  '2026-10-29T22:00:00Z', null, null,
  '[{"amount":54.90,"at":"2026-10-29T22:00:00Z"}]','in_review'),
('PED-1003','Carla Dias (fictícia)','delivered','Sushi Teste',
  '[{"name":"Combo 20 peças","qty":1,"price":79.90},{"name":"Missô","qty":1,"price":12.00}]', 91.90,
  '2026-10-30T23:00:00Z','2026-10-30T23:50:00Z','2026-10-30T23:48:00Z',
  '[{"amount":91.90,"at":"2026-10-30T23:00:00Z"}]','none'),
('PED-1004','Diego Rocha (fictício)','delivered','Hamburgueria Demo',
  '[{"name":"Burger Duplo","qty":1,"price":39.90}]', 39.90,
  '2026-10-30T20:00:00Z','2026-10-30T20:40:00Z','2026-10-30T20:38:00Z',
  '[{"amount":39.90,"at":"2026-10-30T20:00:00Z"},{"amount":39.90,"at":"2026-10-30T20:00:05Z"}]','none'),
('PED-1005','Elisa Prado (fictícia)','delivered','Confeitaria Amostra',
  '[{"name":"Bolo de cenoura","qty":1,"price":32.00}]', 32.00,
  '2026-10-30T19:00:00Z','2026-10-30T19:40:00Z','2026-10-30T19:41:00Z',
  '[{"amount":32.00,"at":"2026-10-30T19:00:00Z"}]','none')
on conflict (id) do nothing;
