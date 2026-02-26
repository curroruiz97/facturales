-- Migrar tipo_cliente de 'sociedad' a 'empresa' en la tabla clientes
UPDATE clientes SET tipo_cliente = 'empresa' WHERE tipo_cliente = 'sociedad';
