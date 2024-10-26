import { db, storage } from '../firebase/clientApp';
import { collection, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface InsuranceCompany {
  id: string;
  name: string;
  imageFile: string;
  primaryColor: string;
}

const insuranceCompanies: InsuranceCompany[] = [
  {
    id: 'folksam',
    name: 'Folksam',
    imageFile: 'folk.png',
    primaryColor: '#005AA0'
  },
  {
    id: 'if',
    name: 'IF Försäkring',
    imageFile: 'if.svg',
    primaryColor: '#00B7EF'
  },
  {
    id: 'lansforsakringar',
    name: 'Länsförsäkringar',
    imageFile: 'lans.png',
    primaryColor: '#005AA0'
  },
  {
    id: 'trygg',
    name: 'Trygg-Hansa',
    imageFile: 'trygg.png',
    primaryColor: '#DA291C'
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const uploadInsuranceCompanies = async () => {
  const companiesRef = collection(db, 'insuranceCompanies');

  for (const company of insuranceCompanies) {
    try {
      console.log(`Starting setup for ${company.name}...`);
      
      // 1. Upload logo to Storage
      const imagePath = path.join(process.cwd(), 'public', 'images', 'insurance', company.imageFile);
      console.log(`Reading file from: ${imagePath}`);
      
      const imageBuffer = fs.readFileSync(imagePath);
      const storageRef = ref(storage, `insurance-companies/${company.imageFile}`);
      
      console.log('Uploading image to storage...');
      const uploadResult = await uploadBytes(storageRef, imageBuffer);
      
      console.log('Getting download URL...');
      const logoUrl = await getDownloadURL(uploadResult.ref);

      // 2. Save company data to Firestore
      console.log('Saving to Firestore...');
      await setDoc(doc(companiesRef, company.id), {
        name: company.name,
        logoUrl,
        primaryColor: company.primaryColor,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`Successfully set up ${company.name}`);
      
      // Add a small delay between operations to avoid rate limiting
      await delay(1000);
    } catch (error) {
      console.error(`Error setting up ${company.name}:`, error);
    }
  }
};

// Run the setup
console.log('Starting insurance companies setup...');
uploadInsuranceCompanies()
  .then(() => {
    console.log('Setup complete! You can now use the insurance companies in your application.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });