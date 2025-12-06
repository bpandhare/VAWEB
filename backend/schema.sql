CREATE DATABASE IF NOT EXISTS vickhardth_ops;
USE vickhardth_ops;

CREATE TABLE IF NOT EXISTS site_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_date DATE NOT NULL,
    log_time TIME NOT NULL,
    project_name VARCHAR(120) NOT NULL,
    daily_target TEXT,
    hourly_activity TEXT,
    problems_faced TEXT,
    resolution_status TEXT,
    problem_start TIME NULL,
    problem_end TIME NULL,
    support_problem TEXT,
    support_start TIME NULL,
    support_end TIME NULL,
    support_engineer VARCHAR(120),
    engineer_remark TEXT,
    incharge_remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    dob DATE,
    role VARCHAR(80),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hourly_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_date DATE NOT NULL,
    time_period VARCHAR(20) NOT NULL, -- e.g., '9am-10am', '10am-11am', etc.
    project_name VARCHAR(120) NOT NULL,
    daily_target TEXT,
    hourly_activity TEXT NOT NULL,
    problem_faced_by_engineer_hourly TEXT,
    problem_resolved_or_not VARCHAR(10), -- 'Yes' or 'No'
    problem_occur_start_time TIME NULL,
    problem_resolved_end_time TIME NULL,
    online_support_required_for_which_problem TEXT,
    online_support_time TIME NULL,
    online_support_end_time TIME NULL,
    engineer_name_who_gives_online_support VARCHAR(120),
    engineer_remark TEXT,
    project_incharge_remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_target_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_date DATE NOT NULL DEFAULT CURDATE(), -- Specific date for this daily target report (for hourly report linking)
    in_time TIME NOT NULL,
    out_time TIME NOT NULL,
    customer_name VARCHAR(120) NOT NULL,
    customer_person VARCHAR(120) NOT NULL,
    customer_contact VARCHAR(20) NOT NULL,
    end_customer_name VARCHAR(120) NOT NULL,
    end_customer_person VARCHAR(120) NOT NULL,
    end_customer_contact VARCHAR(20) NOT NULL,
    project_no VARCHAR(120) NOT NULL,
    location_type VARCHAR(20) NOT NULL,
    site_location VARCHAR(255),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    mom_report_path VARCHAR(255),
    daily_target_planned TEXT NOT NULL,
    daily_target_achieved TEXT NOT NULL,
    additional_activity TEXT,
    who_added_activity VARCHAR(120),
    daily_pending_target TEXT,
    reason_pending_target TEXT,
    problem_faced TEXT,
    problem_resolved TEXT,
    online_support_required TEXT,
    support_engineer_name VARCHAR(120),
    site_start_date DATE NOT NULL,
    site_end_date DATE,
    incharge VARCHAR(120) NOT NULL,
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


