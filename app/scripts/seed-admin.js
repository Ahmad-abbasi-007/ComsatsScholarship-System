const bcrypt = require('bcryptjs');

// Password you want to use
const password = 'admin123';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('========================================');
console.log('📋 SUPER ADMIN CREDENTIALS');
console.log('========================================');
console.log('Email:    admin@comsats.edu.pk');
console.log('Password: admin123');
console.log('Role:     super_admin');
console.log('========================================\n');
console.log('📌 SQL to run in Supabase SQL Editor:\n');

console.log(`
INSERT INTO admins (email, password_hash, name, role, is_active, created_at)
VALUES (
  'admin@comsats.edu.pk',
  '${hash}',
  'Super Admin',
  'super_admin',
  true,
  NOW()
);
`);

console.log('========================================');
console.log('✅ After running SQL, login with:');
console.log('   Email: admin@comsats.edu.pk');
console.log('   Password: admin123');
console.log('========================================');