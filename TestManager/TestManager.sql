-- use testmanager;
select * from config;
select * from custom_modules;
select * from schema_migrations;
select * from test_cases;
select * from test_evidences;
select * from test_executions;
select * from test_projects;

select * from test_cases where code like 'AUTH%' order by code;
select * from test_cases where status LIKE '%MENOR%' order by code;
select * from test_cases where status = 'BLOQUEADO' order by code;