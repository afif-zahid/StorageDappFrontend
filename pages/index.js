import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import Header from "../components/Header";
import styles from "../styles/index.module.css";

const pinataJWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const contractAddress = "0xf44Bb3d88339dB415e9b04042eE28353C6Dc097B";
const contractABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "fileId", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "ipfsHash", "type": "string" },
      { "indexed": false, "internalType": "address", "name": "owner", "type": "address" }
    ],
    "name": "FileStored",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "string", "name": "_ipfsHash", "type": "string" }],
    "name": "storeFile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getFiles",
    "outputs": [{ "internalType": "string[]", "name": "", "type": "string[]" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export default function Home() {
  const [file, setFile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const uploadToIPFS = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile || !pinataJWT) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("pinataMetadata", JSON.stringify({ name: selectedFile.name }));
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    try {
      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${pinataJWT}` },
        body: formData,
      });
      const data = await res.json();
      if (data.IpfsHash) {
        setFile(data.IpfsHash);
      } else {
        alert("Failed to upload file to IPFS.");
      }
    } catch {
      alert("Error uploading to IPFS. Please try again.");
    }
  };

  const saveFileOnBlockchain = async () => {
    if (!file) return alert("Choose a file first!");

    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(connection);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await contract.storeFile(file);
      await tx.wait();

      alert("File stored successfully!");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = ""; 
      fetchUploadedFiles();
    } catch (error) {
      if (error.code === "ACTION_REJECTED") {
        alert("Transaction rejected by user.");
      } else {
        alert("Something went wrong! Please try again.");
      }
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(connection);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const files = await contract.getFiles();

      if (Array.isArray(files)) {
        setUploadedFiles(
          files.map((hash) => ({
            fileUrl: `https://gateway.pinata.cloud/ipfs/${hash}`,
            fileName: hash.substring(0, 10) + "...",
          }))
        );
      }
    } catch {
      alert("Error fetching uploaded files.");
    }
  };

  return (
    <div className={styles.fileStorageContainer}>
      <Header />
      <div className={styles.fileStorageWrapper}>
        <h1 className={styles.fileStorageTitle}>Your Vault</h1>
        <input
          type="file"
          ref={fileInputRef}
          onChange={uploadToIPFS}
          className={styles.fileInput}
        />
        <button onClick={saveFileOnBlockchain} className={styles.storeBtn}>
          Store File
        </button>

        <h2 className={styles.uploadedFilesTitle}>Uploaded Files</h2>
        <div className={styles.filesGrid}>
          {uploadedFiles.length > 0 ? (
            uploadedFiles.map((file, index) => (
              <div key={index} className={styles.fileCard}>
                {file.fileUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                  <img src={file.fileUrl} alt="Uploaded file" className={styles.fileImage} />
                ) : file.fileUrl.endsWith(".pdf") ? (
                  <iframe src={file.fileUrl} width="100%" height="200px"></iframe>
                ) : (
                  <div className={styles.filePlaceholder}>
                    <p>📄 File Preview:</p>
                    <iframe className={styles.fileContent} src={file.fileUrl} width="100%" height="100px"></iframe>
                  </div>
                )}
                <p className={styles.fileName}>{file.fileName}</p>
                <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                  Open File
                </a>
              </div>
            ))
          ) : (
            <p>No files uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
