require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Election = require('./models/Election');
const Candidate = require('./models/Candidate');
const AuditLog = require('./models/AuditLog');
const Notification = require('./models/Notification');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const seedUsers = async () => {
  console.log('Seeding users...');

  const users = [
    {
      name: 'System Administrator',
      email: 'admin@veravote.local',
      password: 'Admin@123',
      role: 'super_admin',
      isVerified: true,
      isActive: true,
    },
    {
      name: 'Regular Voter',
      email: 'voter@veravote.local',
      password: 'Voter@123',
      role: 'voter',
      isVerified: true,
      isActive: true,
    },
    {
      name: 'Election Officer',
      email: 'officer@veravote.local',
      password: 'Officer@123',
      role: 'election_officer',
      isVerified: true,
      isActive: true,
    },
    {
      name: 'Auditor',
      email: 'auditor@veravote.local',
      password: 'Auditor@123',
      role: 'auditor',
      isVerified: true,
      isActive: true,
    },
  ];

  const createdUsers = {};

  for (const userData of users) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      console.log(`User ${userData.email} already exists, skipping`);
      createdUsers[userData.role] = existing;
      continue;
    }

    const user = await User.create({
      ...userData,
    });

    createdUsers[userData.role] = user;
    console.log(`Created user: ${userData.email} (${userData.role})`);
  }

  return {
    admin: createdUsers['super_admin'],
    voter: createdUsers['voter'],
    officer: createdUsers['election_officer'],
    auditor: createdUsers['auditor'],
  };
};

const seedElections = async (users) => {
  console.log('Seeding elections and candidates...');

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const elections = [
    {
      name: 'Student Council President Election 2024',
      description: 'Annual election to elect the Student Council President for the 2024/2025 academic year.',
      electionType: 'student',
      startDate: new Date(now.getTime() - 10 * dayMs),
      endDate: new Date(now.getTime() - 3 * dayMs),
      status: 'ended',
      createdBy: users.admin._id,
      totalVotes: 85,
      resultsReleased: true,
    },
    {
      name: 'Technical Committee Chair 2024',
      description: 'Election of the Technical Committee Chairperson for the current term.',
      electionType: 'committee',
      startDate: new Date(now.getTime() - 5 * dayMs),
      endDate: new Date(now.getTime() + 10 * dayMs),
      status: 'ongoing',
      createdBy: users.officer._id,
      eligibleVoters: [users.voter._id],
      totalVotes: 42,
      resultsReleased: false,
    },
    {
      name: 'General Assembly Representatives',
      description: 'Election of General Assembly representatives for organizational restructuring.',
      electionType: 'general',
      startDate: new Date(now.getTime() + 15 * dayMs),
      endDate: new Date(now.getTime() + 20 * dayMs),
      status: 'scheduled',
      createdBy: users.officer._id,
      eligibleVoters: [users.voter._id],
      totalVotes: 0,
      resultsReleased: false,
    },
  ];

  const createdElections = [];

  for (const electionData of elections) {
    const existing = await Election.findOne({ name: electionData.name });
    if (existing) {
      console.log(`Election "${electionData.name}" already exists, skipping`);
      createdElections.push(existing);
      continue;
    }

    const election = await Election.create(electionData);
    createdElections.push(election);
    console.log(`Created election: ${electionData.name} (${electionData.status})`);
  }

  const candidateData = [
    {
      name: 'Alice Johnson',
      party: 'Vision Alliance',
      bio: 'Dedicated to student welfare and academic excellence.',
      status: 'approved',
      votes: 45,
    },
    {
      name: 'Michael Chen',
      party: 'Progress Party',
      bio: 'Focused on innovation and modern campus infrastructure.',
      status: 'approved',
      votes: 25,
    },
    {
      name: 'Sarah Williams',
      party: 'Unity Front',
      bio: 'Championing inclusion and transparency.',
      status: 'approved',
      votes: 15,
    },
    {
      name: 'David Okafor',
      party: 'Future Now',
      bio: 'Advocating for greener campus and digital learning.',
      status: 'approved',
      votes: 30,
    },
    {
      name: 'Emma Garcia',
      party: 'Independent',
      bio: 'Independent voice for student-led initiatives.',
      status: 'approved',
      votes: 12,
    },
  ];

  let candidateIndex = 0;
  for (const election of createdElections) {
    const existingCandidates = await Candidate.countDocuments({ election: election._id });
    if (existingCandidates > 0) {
      console.log(`Candidates already exist for ${election.name}, skipping`);
      continue;
    }

    const count = election.status === 'scheduled' ? 2 : 3;

    for (let i = 0; i < count && candidateIndex < candidateData.length; i++) {
      const data = candidateData[candidateIndex];
      const candidate = await Candidate.create({
        name: data.name,
        party: data.party,
        bio: data.bio,
        election: election._id,
        addedBy: election.createdBy,
        status: data.status,
        votes: election.totalVotes > 0 ? Math.max(0, data.votes) : 0,
      });

      await Election.findByIdAndUpdate(
        election._id,
        { $addToSet: { candidates: candidate._id } },
        { new: true }
      );

      console.log(`Created candidate: ${data.name} for ${election.name}`);
      candidateIndex++;
    }
  }

  return createdElections;
};

const seedAuditLogs = async (users, elections) => {
  console.log('Seeding audit logs...');

  const logs = [
    {
      user: users.admin._id,
      role: 'super_admin',
      action: 'login',
      description: 'System Administrator logged in successfully',
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
    },
    {
      user: users.admin._id,
      role: 'super_admin',
      action: 'election_created',
      description: 'System Administrator created election "Student Council President Election 2024"',
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
      metadata: { electionId: elections[0] ? elections[0]._id : null },
    },
    {
      user: users.officer._id,
      role: 'election_officer',
      action: 'election_created',
      description: 'Election Officer created election "Technical Committee Chair 2024"',
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
      metadata: { electionId: elections[1] ? elections[1]._id : null },
    },
    {
      user: users.officer._id,
      role: 'election_officer',
      action: 'candidate_added',
      description: 'Election Officer added candidate "David Okafor" to election "Technical Committee Chair 2024"',
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
    },
    {
      user: users.auditor._id,
      role: 'auditor',
      action: 'login',
      description: 'Auditor logged in successfully',
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
    },
    {
      user: users.voter._id,
      role: 'voter',
      action: 'vote_cast',
      description: 'Regular Voter cast a vote in election "Student Council President Election 2024"',
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
      metadata: { receiptId: 'VX-SEED0001' },
    },
    {
      user: users.admin._id,
      role: 'super_admin',
      action: 'voter_verified',
      description: 'System Administrator verified voter "Regular Voter"',
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
    },
  ];

  let count = 0;
  for (const logData of logs) {
    const existing = await AuditLog.findOne({
      description: logData.description,
    });
    if (existing) {
      console.log(`Audit log already exists, skipping: ${logData.description}`);
      continue;
    }
    await AuditLog.create(logData);
    count++;
  }

  console.log(`Created ${count} audit logs`);
};

const seedNotifications = async (users) => {
  console.log('Seeding notifications...');

  const notifications = [
    {
      user: users.voter._id,
      title: 'Welcome to VERAVOTE',
      message: 'Your voter account has been created and verified.',
      type: 'account_verification',
    },
    {
      user: users.voter._id,
      title: 'Election Results Released',
      message: 'Results for "Student Council President Election 2024" have been released.',
      type: 'election_ending',
    },
    {
      user: users.voter._id,
      title: 'Voting Open',
      message: 'Voting is now open for "Technical Committee Chair 2024".',
      type: 'election_starting',
    },
  ];

  let count = 0;
  for (const data of notifications) {
    const existing = await Notification.findOne({ title: data.title, user: data.user });
    if (existing) {
      console.log(`Notification already exists, skipping: ${data.title}`);
      continue;
    }
    await Notification.create(data);
    count++;
  }

  console.log(`Created ${count} notifications`);
};

const seed = async () => {
  try {
    await connectDB();

    const users = await seedUsers();
    const elections = await seedElections(users);
    await seedAuditLogs(users, elections);
    await seedNotifications(users);

    console.log('VERAVOTE database seeded successfully!');
    console.log('=== Test Credentials ===');
    console.log('Admin:   admin@veravote.local / Admin@123');
    console.log('Voter:   voter@veravote.local / Voter@123');
    console.log('Officer: officer@veravote.local / Officer@123');
    console.log('Auditor: auditor@veravote.local / Auditor@123');
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    process.exit(0);
  }
};

seed();