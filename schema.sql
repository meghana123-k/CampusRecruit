CREATE DATABASE campus_recruit;
USE campus_recruit;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('student', 'recruiter', 'admin') DEFAULT 'student',
  bio TEXT
);

CREATE TABLE jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  recruiter_id INT,
  FOREIGN KEY (recruiter_id) REFERENCES users(id)
);

CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT,
  job_id INT,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);