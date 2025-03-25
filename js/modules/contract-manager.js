/**
 * Contract manager module for Platform Engagement Tracker
 * Handles CRUD operations for content creation contracts
 */

import { getCurrentUser, saveUserData, loadUserData } from './storage.js';

// Constants
const CONTRACT_STORAGE_KEY = 'contracts';

/**
 * Load all contracts for current user
 * @returns {Promise<Array>} Array of contract objects
 */
export async function loadContracts() {
    try {
        const contracts = await loadUserData(CONTRACT_STORAGE_KEY, []);
        console.log(`Loaded ${contracts.length} contracts`);
        return contracts;
    } catch (error) {
        console.error('Error loading contracts:', error);
        return [];
    }
}

/**
 * Save contracts for current user
 * @param {Array} contracts - Array of contract objects to save
 * @returns {Promise<boolean>} Success flag
 */
export async function saveContracts(contracts) {
    try {
        if (!Array.isArray(contracts)) {
            throw new Error('Contracts must be an array');
        }
        
        await saveUserData(CONTRACT_STORAGE_KEY, contracts);
        console.log(`Saved ${contracts.length} contracts`);
        return true;
    } catch (error) {
        console.error('Error saving contracts:', error);
        return false;
    }
}

/**
 * Add a new contract
 * @param {Object} contractData - Contract data
 * @returns {Promise<Object>} Newly created contract with ID
 */
export async function addContract(contractData) {
    try {
        if (!contractData || typeof contractData !== 'object') {
            throw new Error('Invalid contract data');
        }
        
        // Required fields validation
        const requiredFields = ['clientName', 'projectName', 'dueDate', 'deliverables'];
        for (const field of requiredFields) {
            if (!contractData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        // Load existing contracts
        const contracts = await loadContracts();
        
        // Create new contract with generated ID and timestamps
        const newContract = {
            ...contractData,
            id: generateContractId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: contractData.status || 'pending' // Default status
        };
        
        // Add to contracts array
        contracts.push(newContract);
        
        // Save updated contracts
        await saveContracts(contracts);
        
        return newContract;
    } catch (error) {
        console.error('Error adding contract:', error);
        throw error; // Re-throw for caller to handle
    }
}

/**
 * Update existing contract
 * @param {string} contractId - ID of contract to update
 * @param {Object} contractData - Updated contract data
 * @returns {Promise<Object>} Updated contract object
 */
export async function updateContract(contractId, contractData) {
    try {
        if (!contractId) {
            throw new Error('Contract ID is required');
        }
        
        // Load existing contracts
        const contracts = await loadContracts();
        
        // Find contract index
        const contractIndex = contracts.findIndex(c => c.id === contractId);
        if (contractIndex === -1) {
            throw new Error(`Contract not found with ID: ${contractId}`);
        }
        
        // Create updated contract
        const updatedContract = {
            ...contracts[contractIndex],
            ...contractData,
            updatedAt: new Date().toISOString()
        };
        
        // Update in array
        contracts[contractIndex] = updatedContract;
        
        // Save updated contracts
        await saveContracts(contracts);
        
        return updatedContract;
    } catch (error) {
        console.error('Error updating contract:', error);
        throw error;
    }
}

/**
 * Delete contract by ID
 * @param {string} contractId - ID of contract to delete
 * @returns {Promise<boolean>} Success flag
 */
export async function deleteContract(contractId) {
    try {
        // Load existing contracts
        const contracts = await loadContracts();
        
        // Filter out the contract to delete
        const updatedContracts = contracts.filter(c => c.id !== contractId);
        
        // Check if contract was found and removed
        if (updatedContracts.length === contracts.length) {
            throw new Error(`Contract not found with ID: ${contractId}`);
        }
        
        // Save updated contracts
        await saveContracts(updatedContracts);
        
        return true;
    } catch (error) {
        console.error('Error deleting contract:', error);
        throw error;
    }
}

/**
 * Generate unique contract ID
 * @returns {string} Unique contract ID
 */
function generateContractId() {
    return 'contract_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
} 