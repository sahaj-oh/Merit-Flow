-- ============================================================
-- Merit Flow — STEP 1 / Users table + employees seed
-- Run this BEFORE 02_reviews.sql.
-- Re-running drops and re-creates the users table (loses data).
-- ============================================================

DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS users   CASCADE;
DROP TYPE  IF EXISTS role;

CREATE TYPE role AS ENUM ('admin', 'manager', 'employee');

CREATE TABLE users (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number    VARCHAR(32)  NOT NULL UNIQUE,
  full_name          TEXT         NOT NULL,
  email              TEXT         NOT NULL UNIQUE,
  date_of_joining    TIMESTAMP,
  job_title          TEXT         NOT NULL,
  business_unit      TEXT,
  department         TEXT,
  location           TEXT,
  legal_entity       TEXT,
  reporting_to_name  TEXT,
  manager_id         UUID         REFERENCES users(id) ON DELETE SET NULL,
  role               role         NOT NULL DEFAULT 'employee',
  created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX users_email_idx   ON users(email);
CREATE INDEX users_manager_idx ON users(manager_id);

INSERT INTO users
  (employee_number, full_name, email, date_of_joining, job_title,
   business_unit, department, location, legal_entity, reporting_to_name, role)
SELECT
  emp_no, full_name, LOWER(email),
  TO_DATE(doj, 'DD-Mon-YYYY'),
  job_title, biz_unit, dept, loc, entity, reports_to,
  (CASE
    WHEN job_title = 'Admin' OR job_title ILIKE '%co-founder%' THEN 'admin'
    WHEN job_title ILIKE '%manager%'                            THEN 'manager'
    ELSE 'employee'
  END)::role
FROM (VALUES
  ('OH-001','Rahool Sureka','rahool@openhouse.in','04-Jul-2024','Co-Founder','Openhouse','Management','Gurugram, Haryana','Openhouse',NULL),
  ('OH-002','Ankit Khemka','ankit@openhouse.in','04-Jul-2024','Co-Founder','Openhouse','Management','Gurugram, Haryana','Openhouse',NULL),
  ('OH-007','Akshit Chaudhary','akshit@openhouse.in','04-Nov-2024','Manager','Openhouse','Data & Strategy','Gurugram, Haryana','Openhouse','Rahool Sureka'),
  ('OH-009','Ankit Kumar','ankit.kumar@openhouse.in','20-Dec-2024','Business Development - Executive','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-011','Saurabh Makhariya','saurabh@openhouse.in','04-Jan-2025','Manager','Openhouse','Projects & Operations','Gurugram, Haryana','Openhouse','Rahool Sureka'),
  ('OH-012','Mohd Umer Khan','umer.khan@openhouse.in','19-Feb-2025','Business Development - Executive','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-013','Arti Ahirwar','arti.ahirwar@openhouse.in','01-Apr-2025','Business Development - Executive','Openhouse','Business Development - Acquisition Team','Gurugram, Haryana','Openhouse','Ashish Bibyan'),
  ('OH-014','Abhishek Singh Rathore','abhishek.rathore@openhouse.in','03-May-2025','Manager','Openhouse','Business Development - Acquisition Team','Gurugram, Haryana','Openhouse','Ashish Bibyan'),
  ('OH-017','Abhash Kumar','abhash.kumar@openhouse.in','27-May-2025','Business Development - Executive','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-019','Ajitesh Kumar Singh','ajitesh.singh@openhouse.in','19-Jun-2025','Business Development - Manager','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-020','Amisha Maheshwari','amisha.maheshwari@openhouse.in','23-Jun-2025','Accounts Executive','Openhouse','Finance & Accounts','Gurugram, Haryana','Openhouse','Ankit Khemka'),
  ('OH-021','Puran Singh Kiraula','kiraula.puran@openhouse.in','01-Jul-2025','Business Development - Manager','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-022','Shikha Sharma','shikha.sharma@openhouse.in','01-Jul-2025','Project Supervisor','Openhouse','Projects & Operations','Gurugram, Haryana','Openhouse','Saurabh Makhariya'),
  ('OH-023','Vinay Kumar','vinay.kumar@openhouse.in','03-Jul-2025','Business Development - Manager','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-024','Rupali Prasad','rupali.prasad@openhouse.in','28-Jul-2025','Sales- Team Lead','Openhouse','Business Development - Acquisition Team','Gurugram, Haryana','Openhouse','Ashish Bibyan'),
  ('OH-025','Mohit Kumar Singh','mohit.kumar@openhouse.in','13-Aug-2025','Project Supervisor','Openhouse','Projects & Operations','Gurugram, Haryana','Openhouse','Mohit Chaudhary'),
  ('OH-026','Deepak Sharma','deepak.sharma@openhouse.in','18-Aug-2025','Project Supervisor','Openhouse','Projects & Operations','Gurugram, Haryana','Openhouse','Mohit Chaudhary'),
  ('OH-030','Susmita Roy','sushmita.roy@openhouse.in','08-Sep-2025','Business Development - Executive','Openhouse','Business Development - Acquisition Team','Gurugram, Haryana','Openhouse','Ashish Bibyan'),
  ('OH-031','Adiksha Sahu','adiksha.sahu@openhouse.in','11-Sep-2025','Sales- Team Lead','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-034','Shashank Kumar','shashank.kumar@openhouse.in','18-Sep-2025','Business Development - Manager','Openhouse','Business Development - Acquisition Team','Gurugram, Haryana','Openhouse','Ashish Bibyan'),
  ('OH-036','Praveen Kumar','praveen.kumar@openhouse.in','27-Sep-2025','Field Sales Executive','Openhouse','Business Development - Acquisition Team','Gurugram, Haryana','Openhouse','Ashish Bibyan'),
  ('OH-037','Gajanan Srivastava','gajanan.srivastava@openhouse.in','24-Oct-2025','Human Resource - Manager','Openhouse','Human Resource','Gurugram, Haryana','Openhouse','Rahool Sureka'),
  ('OH-039','Rajnish Prjapat','rajnish@openhouse.in','29-Oct-2025','Manager','Openhouse','Growth and Marketing','Gurugram, Haryana','Openhouse','Ankit Khemka'),
  ('OH-040','Saumya Ranjan Behera','saumya.behera@openhouse.in','06-Nov-2025','Business Development - Manager','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-042','Manish Pal','manish.pal@openhouse.in','13-Nov-2025','Manager','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Ankit Khemka'),
  ('OH-043','Rahul Kumar','rahul.kumar@openhouse.in','17-Nov-2025','Product Designer','Openhouse','Growth and Marketing','Gurugram, Haryana','Openhouse','Rajnish Prjapat'),
  ('OH-044','Akash Teotia','akash.teotia@openhouse.in','17-Nov-2025','Legal Associate','Openhouse','Projects & Operations','Gurugram, Haryana','Openhouse','Saurabh Makhariya'),
  ('OH-045','Shubham Sharma','shubham.sharma@openhouse.in','21-Nov-2025','Business Development - Executive','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-047','Joginder Singh','joginder.singh@openhouse.in','15-Dec-2025','Business Development - Manager','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-048','Vipul Suneja','vipul.suneja@openhouse.com','17-Dec-2025','Business Development - Manager','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-049','Aman Singh Rawat','aman.rawat@openhouse.in','17-Dec-2025','Business Development - Manager','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-050','Mohit Chaudhary','mohit.chaudhary@openhouse.in','18-Dec-2025','Operations Manager','Openhouse','Projects & Operations','Gurugram, Haryana','Openhouse','Saurabh Makhariya'),
  ('OH-051','Ashwani Tyagi','ashwani.tyagi@openhouse.in','22-Dec-2025','Operations Associate','Openhouse','Projects & Operations','Gurugram, Haryana','Openhouse','Saurabh Makhariya'),
  ('OH-052','Ashish Bibyan','ashish@openhouse.in','22-Dec-2025','Manager','Openhouse','Business Development - Acquisition Team','Gurugram, Haryana','Openhouse','Prashant Kumar'),
  ('OH-053','Harshit Thakur','harshit.thakur@openhouse.in','05-Jan-2026','Graphic Designer','Openhouse','Growth and Marketing','Gurugram, Haryana','Openhouse','Rajnish Prjapat'),
  ('OH-054','Animesh Kumar Singh','animesh.singh@openhouse.in','14-Jan-2026','Business Development - Manager','Openhouse','Business Development - Acquisition Team','Gurugram, Haryana','Openhouse','Ashish Bibyan'),
  ('OH-055','Ashwani Sharma','ashwani.sharma@openhouse.in','15-Jan-2026','Business Development - Manager','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-056','Rahul Singh','rahul.singh@openhouse.in','02-Feb-2026','Field Executive: Supply Acquisitions','Openhouse','Business Development - Acquisition Team','Gurugram, Haryana','Openhouse','Ashish Bibyan'),
  ('OH-059','Sahil Singh','sahil.singh@openhouse.in','11-Feb-2026','Business Development - Executive','Openhouse','Business Development - Acquisition Team','Noida','Openhouse','Abhishek Singh Rathore'),
  ('OH-060','Sahil Kumar','sahil.kumar@openhouse.in','11-Feb-2026','Business Development - Manager','Openhouse','Business Development - Demand Team','Noida','Openhouse','Manish Pal'),
  ('OH-061','Kavita Rawat','kavita.rawat@openhouse.in','11-Feb-2026','Business Development - Manager','Openhouse','Business Development - Acquisition Team','Noida','Openhouse','Abhishek Singh Rathore'),
  ('OH-062','Saket Kumar','saket.kumar@openhouse.in','12-Feb-2026','Business Development - Executive','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-063','Nishant Kumar','nishant.kumar@openhouse.in','18-Feb-2026','Business Development - Executive','Openhouse','Business Development - Acquisition Team','Noida','Openhouse','Ashish Bibyan'),
  ('OH-065','Aman Dixit','aman.dixit@openhouse.in','23-Feb-2026','Business Development - Manager','Openhouse','Business Development - Acquisition Team','Noida','Openhouse','Abhishek Singh Rathore'),
  ('OH-066','Mukul Chhabra','mukul.chhabra@openhouse.in','09-Mar-2026','Business Development - Executive','Openhouse','Business Development - Demand Team','Gurugram, Haryana','Openhouse','Manish Pal'),
  ('OH-068','Nisha Deewan','nisha.deewan@openhouse.in','15-Mar-2026','Business Development - Executive','Openhouse','Business Development - Acquisition Team','Gurugram, Haryana','Openhouse','Ashish Bibyan'),
  ('OH-069','Mayank Kumar Chauhan','mayank.chauhan@openhouse.in','20-Mar-2026','Business Development - Assistant Manager','Openhouse','Business Development - Demand Team','Noida','Openhouse','Manish Pal'),
  ('OH-070','Anurag Gautam','anurag.gautam@openhouse.in','23-Mar-2026','Frontend Developer','Openhouse','Data & Strategy','Gurugram, Haryana','Openhouse','Akshit Chaudhary'),
  ('OHC002','Prashant Kumar','prashant@openhouse.in','01-Jul-2025','Manager','Openhouse','Business Development - Acquisition Team','Gurugram, Haryana','Openhouse','Rahool Sureka'),
  ('ADMIN','Test Sahaj','sahaj.dureja@openhouse.in','18-Feb-2026','Admin','Openhouse','HR','Gurugram, Haryana','Openhouse',NULL),
  ('TEST','Test','support@openhouse.in','18-Feb-2026','Frontend Developer','Openhouse','Data & Strategy','Gurugram, Haryana','Openhouse','Gajanan Srivastava')
) AS raw(emp_no, full_name, email, doj, job_title, biz_unit, dept, loc, entity, reports_to);

UPDATE users u
SET manager_id = m.id
FROM users m
WHERE u.reporting_to_name IS NOT NULL
  AND LOWER(TRIM(u.reporting_to_name)) = LOWER(TRIM(m.full_name));

-- Verify
SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY role;
SELECT full_name, reporting_to_name
FROM users
WHERE reporting_to_name IS NOT NULL AND manager_id IS NULL;
