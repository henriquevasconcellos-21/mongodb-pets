<script setup lang="ts">
import { ref } from 'vue'
import { API_BASE_URL } from '../api'

const emit = defineEmits(['pet-added'])

const name = ref('')
const birthDate = ref('')
const breed = ref('')
const species = ref('Dog')
const microchip = ref('')
const description = ref('')
const image = ref<File | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    image.value = target.files[0]
  }
}

const registerPet = async () => {
  loading.value = true
  error.value = null
  success.value = false

  try {
    const formData = new FormData()
    formData.append('name', name.value)
    formData.append('birthDate', birthDate.value)
    formData.append('breed', breed.value)
    formData.append('species', species.value)
    if (microchip.value) {
      formData.append('_id', microchip.value)
    }
    formData.append('description', description.value)
    if (image.value) {
      formData.append('image', image.value)
    }

    const response = await fetch(`${API_BASE_URL}/pets`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to register pet')
    }

    success.value = true
    name.value = ''
    birthDate.value = ''
    breed.value = ''
    species.value = 'Dog'
    microchip.value = ''
    description.value = ''
    image.value = null
    // Reset file input
    const fileInput = document.getElementById('image') as HTMLInputElement
    if (fileInput) fileInput.value = ''
    
    emit('pet-added')
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-container">
    <div class="register-card">
      <h1>Register New <span class="mongodb-green">Pet</span></h1>
      <p class="subtitle">Enter the pet's details to add them to the database.</p>

      <form @submit.prevent="registerPet" class="register-form">
        <div class="form-row">
          <div class="form-group">
            <label for="name">Name</label>
            <input id="name" v-model="name" type="text" required placeholder="Enter pet's name" />
          </div>

          <div class="form-group">
            <label for="species">Species</label>
            <select id="species" v-model="species" required>
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="breed">Breed</label>
            <input id="breed" v-model="breed" type="text" required placeholder="e.g. Golden Retriever" />
          </div>

          <div class="form-group">
            <label for="microchip">Microchip Number (ID)</label>
            <input id="microchip" v-model="microchip" type="text" placeholder="Optional custom ID" />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="birthDate">Birth Date</label>
            <input id="birthDate" v-model="birthDate" type="date" required />
          </div>

          <div class="form-group">
            <label for="image">Pet Image</label>
            <input id="image" type="file" @change="handleFileUpload" accept="image/*" />
          </div>
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" v-model="description" rows="3" placeholder="Tell us more about this pet..."></textarea>
        </div>
        
        <button type="submit" :disabled="loading" class="submit-btn">
          {{ loading ? 'Registering...' : 'Register Pet' }}
        </button>

        <div v-if="error" class="message error">{{ error }}</div>
        <div v-if="success" class="message success">Pet registered successfully!</div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}

.register-card {
  background-color: white;
  padding: 40px;
  border-radius: 24px;
  box-shadow: 0 10px 30px rgba(0, 30, 43, 0.1);
  width: 100%;
  max-width: 700px;
  text-align: left;
  border: 1px solid #e8edeb;
}

.register-card h1 {
  margin: 0 0 10px 0;
  color: #001e2b;
  font-size: 2.2rem;
}

.subtitle {
  color: #4d616c;
  margin-bottom: 30px;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #001e2b;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px;
  border: 1px solid #c2cfd6;
  border-radius: 8px;
  font-size: 1rem;
  color: #001e2b;
  background-color: #f9fbfa;
  transition: all 0.2s;
  width: 100%;
  box-sizing: border-box;
}

.form-group textarea {
  resize: vertical;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #00ed64;
  box-shadow: 0 0 0 3px rgba(0, 237, 100, 0.1);
  background-color: white;
}

.submit-btn {
  background-color: #001e2b;
  color: white;
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 10px;
}

.submit-btn:hover {
  background-color: #003049;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.message {
  text-align: center;
  margin-top: 20px;
  padding: 15px;
  border-radius: 8px;
  font-weight: 600;
}

.error {
  background-color: #ffebee;
  color: #c62828;
}

.success {
  background-color: #e8f5e9;
  color: #00684a;
}

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
  }
}
</style>
