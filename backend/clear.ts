import mongoose from 'mongoose';
mongoose.connect('mongodb://127.0.0.1:27017/attashop').then(async () => {
    await mongoose.connection.db.collection('products').drop().catch(()=>console.log('No collection'));
    console.log('Products collection dropped successfully!');
    process.exit(0);
});
