const dns = require("dns");
const { MongoClient } = require("mongodb");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const SOURCE_URI = "mongodb+srv://atozaccessories2:s2mLBPNzNYZqtftw@atozaccessory.42jknvm.mongodb.net/atozaccessoryTwo";
const TARGET_URI = "mongodb+srv://atozaccessories0_db_user:eTLZ7qi6tsnc7Yt6@atoztest.ulmej2u.mongodb.net/atozNew";

async function migrate() {
  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {
    console.log("🔌 Connecting to source database...");
    await sourceClient.connect();
    console.log("✅ Connected to source");

    console.log("🔌 Connecting to target database...");
    await targetClient.connect();
    console.log("✅ Connected to target");

    const sourceDb = sourceClient.db();
    const targetDb = targetClient.db();

    const collections = await sourceDb.listCollections().toArray();
    console.log(`\n📦 Found ${collections.length} collections: ${collections.map(c => c.name).join(", ")}\n`);

    for (const { name } of collections) {
      const docs = await sourceDb.collection(name).find({}).toArray();

      if (docs.length === 0) {
        console.log(`⏭️  Skipping "${name}" — empty`);
        continue;
      }

      await targetDb.collection(name).deleteMany({});
      await targetDb.collection(name).insertMany(docs);
      console.log(`✅ "${name}" — copied ${docs.length} documents`);
    }

    console.log("\n🎉 Migration complete!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

migrate();
