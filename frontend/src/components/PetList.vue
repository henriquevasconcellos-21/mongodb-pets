<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { API_BASE_URL } from '../api'

interface Pet {
  _id?: string
  name: string
  birthDate: string | Date
  breed: string
  species: string
  adopted: boolean
  description?: string
  image: string
}

// Pagination state
const currentPage = ref(1)
const totalPets = ref(0) 
const totalPages = computed(() => {
  const limit = filterLimit.value === 'all' ? (pets.value.length || 20) : parseInt(filterLimit.value) || 20
  if (hasActiveFilters.value) {
    return Math.ceil(pets.value.length / limit)
  }
  return Math.ceil(totalPets.value / limit)
})

const paginatedPets = computed(() => {
  if (!hasActiveFilters.value) {
    return pets.value
  }
  
  const limit = filterLimit.value === 'all' ? pets.value.length : parseInt(filterLimit.value) || 20
  const start = (currentPage.value - 1) * limit
  const end = start + limit
  return pets.value.slice(start, end)
})

const visiblePages = computed(() => {
  const current = currentPage.value
  const total = totalPages.value
  const delta = 2
  const left = current - delta
  const right = current + delta + 1
  const range = []
  const rangeWithDots = []
  let l

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= left && i < right)) {
      range.push(i)
    }
  }

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (i - l !== 1) {
        rangeWithDots.push('...')
      }
    }
    rangeWithDots.push(i)
    l = i
  }

  return rangeWithDots
})

const pets = ref<Pet[]>([])
const breeds = ref<string[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const metrics = ref<any>(null)
const showMetrics = ref(false)

// Modal state
const selectedPet = ref<Pet | null>(null)
const isEditMode = ref(false)
const editForm = ref({
  name: '',
  birthDate: '',
  breed: '',
  species: '',
  adopted: false,
  description: ''
})
const editImage = ref<File | null>(null)
const updateLoading = ref(false)
const updateError = ref<string | null>(null)

// Filters
const filterName = ref('')
const filterBreed = ref('')
const filterSpecies = ref('')
const filterAdopted = ref<string>('') // Using string for select ('', 'true', 'false')
const filterBornAfter = ref('')
const filterMicrochip = ref('')
const filterLimit = ref('20') 
const useAtlasSearch = ref(false)
const sortName = ref<'asc' | 'desc' | 'none'>('none')
const sortBreed = ref<'asc' | 'desc' | 'none'>('none')
const sortBirthDate = ref<'asc' | 'desc' | 'none'>('none')

// Track if we have performed a filtered search
const hasSearchedWithFilters = ref(false)

const hasActiveFilters = computed(() => {
  return filterName.value !== '' || 
         filterBreed.value !== '' || 
         filterSpecies.value !== '' || 
         filterAdopted.value !== '' || 
         filterBornAfter.value !== '' || 
         filterMicrochip.value !== ''
})

const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-GB').format(date)
}

// Default avatars using high-quality emoji-based SVGs
const DEFAULT_AVATARS: Record<string, string> = {
  dog: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f0f2f2"/><text y="70" x="10" font-size="70">🐶</text></svg>',
  cat: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f0f2f2"/><text y="70" x="10" font-size="70">🐱</text></svg>',
  generic: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f0f2f2"/><text y="70" x="10" font-size="70">🐾</text></svg>'
}

const getPetImage = (pet: Pet) => {
  if (!pet.image || pet.image.trim() === '') {
    const species = pet.species?.toLowerCase() || ''
    return DEFAULT_AVATARS[species] || DEFAULT_AVATARS.generic
  }
  return pet.image
}

const handleImageError = (event: Event, pet: Pet) => {
  const img = event.target as HTMLImageElement
  const species = pet.species?.toLowerCase() || ''
  img.src = DEFAULT_AVATARS[species] || DEFAULT_AVATARS.generic
}

const fetchBreeds = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/pets/breeds`)
    if (response.ok) {
      breeds.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to fetch breeds:', err)
  }
}

const fetchPets = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filterName.value) params.append('name', filterName.value)
    if (filterBreed.value) params.append('breed', filterBreed.value)
    if (filterSpecies.value) params.append('species', filterSpecies.value)
    if (filterAdopted.value !== '') params.append('adopted', filterAdopted.value)
    if (filterBornAfter.value) params.append('bornAfter', filterBornAfter.value)
    if (filterMicrochip.value) params.append('microchipNumber', filterMicrochip.value)
    if (useAtlasSearch.value) params.append('useAtlasSearch', 'true')
    
    if (sortName.value !== 'none') params.append('sortName', sortName.value)
    if (sortBreed.value !== 'none') params.append('sortBreed', sortBreed.value)
    if (sortBirthDate.value !== 'none') params.append('sortBirthDate', sortBirthDate.value)

    if (!hasActiveFilters.value) {
      params.append('page', currentPage.value.toString())
      const limit = filterLimit.value === 'all' ? '1000000' : filterLimit.value
      params.append('limit', limit)
    }

    const response = await fetch(`${API_BASE_URL}/pets?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Failed to fetch pets')
    }
    const data = await response.json()
    pets.value = data.results
    metrics.value = data.metrics
    totalPets.value = data.total
    
    hasSearchedWithFilters.value = hasActiveFilters.value
    if (!hasSearchedWithFilters.value) {
      showMetrics.value = false
    }
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  currentPage.value = 1 
  fetchPets()
}

const resetFilters = () => {
  filterName.value = ''
  filterBreed.value = ''
  filterSpecies.value = ''
  filterAdopted.value = ''
  filterBornAfter.value = ''
  filterMicrochip.value = ''
  currentPage.value = 1
  filterLimit.value = '20'
  sortName.value = 'none'
  sortBreed.value = 'none'
  sortBirthDate.value = 'none'
  hasSearchedWithFilters.value = false
  showMetrics.value = false
  fetchPets()
}

const toggleSort = (field: 'name' | 'breed' | 'birthDate') => {
  if (field === 'name') {
    sortName.value = sortName.value === 'asc' ? 'desc' : (sortName.value === 'desc' ? 'none' : 'asc');
  } else if (field === 'breed') {
    sortBreed.value = sortBreed.value === 'asc' ? 'desc' : (sortBreed.value === 'desc' ? 'none' : 'asc');
  } else if (field === 'birthDate') {
    sortBirthDate.value = sortBirthDate.value === 'asc' ? 'desc' : (sortBirthDate.value === 'desc' ? 'none' : 'asc');
  }
  applyFilters()
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchPets()
  }
}

const openPetDetails = (pet: Pet) => {
  selectedPet.value = pet
  isEditMode.value = false
  updateError.value = null
}

const closePetDetails = () => {
  selectedPet.value = null
  isEditMode.value = false
  editImage.value = null
}

const startEdit = () => {
  if (!selectedPet.value) return
  const date = new Date(selectedPet.value.birthDate)
  const formattedDate = date.toISOString().split('T')[0]
  
  editForm.value = {
    name: selectedPet.value.name,
    birthDate: formattedDate,
    breed: selectedPet.value.breed,
    species: selectedPet.value.species,
    adopted: selectedPet.value.adopted,
    description: selectedPet.value.description || ''
  }
  isEditMode.value = true
}

const handleEditImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    editImage.value = target.files[0]
  }
}

const savePetChanges = async () => {
  if (!selectedPet.value?._id) return
  
  updateLoading.value = true
  updateError.value = null
  
  try {
    const formData = new FormData()
    formData.append('name', editForm.value.name)
    formData.append('birthDate', editForm.value.birthDate)
    formData.append('breed', editForm.value.breed)
    formData.append('species', editForm.value.species)
    formData.append('adopted', String(editForm.value.adopted))
    formData.append('description', editForm.value.description)
    if (editImage.value) {
      formData.append('image', editImage.value)
    }

    const response = await fetch(`${API_BASE_URL}/pets/${selectedPet.value._id}`, {
      method: 'PATCH',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Failed to update pet information')
    }

    const updatedPet = await response.json()
    
    const index = pets.value.findIndex(p => p._id === updatedPet._id)
    if (index !== -1) {
      pets.value[index] = updatedPet
    }
    selectedPet.value = updatedPet
    isEditMode.value = false
    editImage.value = null
  } catch (err) {
    updateError.value = (err as Error).message
  } finally {
    updateLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchBreeds(), fetchPets()])
})

defineExpose({ fetchPets })
</script>

<template>
  <div class="dog-list-container">
    <div class="filter-section">
      <div class="filter-group atlas-search-toggle">
        <label class="switch-label">
          <div class="switch">
            <input type="checkbox" v-model="useAtlasSearch" @change="applyFilters">
            <span class="slider round"></span>
          </div>
          <span class="label-text">Atlas Search</span>
        </label>
      </div>
      <div class="filter-group">
        <label for="name" class="sortable-label" @click="toggleSort('name')" title="Click to sort by Name">
          Name {{ sortName === 'asc' ? '↑' : (sortName === 'desc' ? '↓' : '') }}
        </label>
        <input id="name" v-model="filterName" placeholder="Pet name..." @keyup.enter="applyFilters" />
      </div>
      <div class="filter-group">
        <label for="species">Species:</label>
        <select id="species" v-model="filterSpecies" @change="applyFilters">
          <option value="">All Species</option>
          <option value="Dog">Dog</option>
          <option value="Cat">Cat</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="breed" class="sortable-label" @click="toggleSort('breed')" title="Click to sort by Breed">
          Breed {{ sortBreed === 'asc' ? '↑' : (sortBreed === 'desc' ? '↓' : '') }}
        </label>
        <select id="breed" v-model="filterBreed">
          <option value="">All Breeds</option>
          <option v-for="breed in breeds" :key="breed" :value="breed">
            {{ breed }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <label for="adopted">Status:</label>
        <select id="adopted" v-model="filterAdopted" @change="applyFilters">
          <option value="">All Status</option>
          <option value="false">Available</option>
          <option value="true">Adopted</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="bornAfter" class="sortable-label" @click="toggleSort('birthDate')" title="Click to sort by Birth Date">
          Born After {{ sortBirthDate === 'asc' ? '↑' : (sortBirthDate === 'desc' ? '↓' : '') }}
        </label>
        <input id="bornAfter" v-model="filterBornAfter" type="date" @keyup.enter="applyFilters" />
      </div>

      <div class="filter-group">
        <label for="microchip">Microchip Number:</label>
        <input id="microchip" v-model="filterMicrochip" placeholder="Enter microchip..." @keyup.enter="applyFilters" />
      </div>

      <div class="actions-group">
        <button @click="applyFilters" class="apply-btn">Apply Filters</button>
        <button @click="resetFilters" class="reset-btn">Reset</button>
        <button v-if="hasSearchedWithFilters" @click="showMetrics = !showMetrics" class="metrics-toggle-btn">
          {{ showMetrics ? 'Hide Metrics' : 'Show Metrics' }}
        </button>
      </div>
    </div>

    <div v-if="showMetrics && metrics" class="metrics-panel">
      <h3><span class="mongodb-green">●</span> MongoDB Query Analytics</h3>
      <div class="metrics-content">
        <div class="metrics-main">
          <div class="metric-card">
            <span class="label">Total Latency</span>
            <span class="value">{{ metrics.totalLatencyMillis }}<small>ms</small></span>
          </div>
          <div class="metric-card">
            <span class="label">Execution Time</span>
            <span class="value">{{ metrics.executionTimeMillis }}<small v-if="typeof metrics.executionTimeMillis === 'number'">ms</small></span>
          </div>
          <div class="metric-card">
            <span class="label">Documents Scanned</span>
            <span class="value">{{ metrics.docsScanned }}</span>
          </div>
          <div class="metric-card">
            <span class="label">Documents Returned</span>
            <span class="value">{{ metrics.docsReturned }}</span>
          </div>
          <div class="metric-card full-width">
            <span class="label">Indexes Used</span>
            <span class="value highlight">{{ Array.isArray(metrics.indexesUsed) && metrics.indexesUsed.length > 0 ? metrics.indexesUsed.join(', ') : (metrics.indexesUsed === '-' ? '-' : 'COLLSCAN (No index used)') }}</span>
          </div>
        </div>
        <div class="metrics-code">
          <span class="label">{{ useAtlasSearch ? 'Aggregation Pipeline ($search)' : 'MQL Query' }}</span>
          <div class="json-display">
            <div class="query-parts" v-if="!useAtlasSearch">
              <div class="query-part">
                <span class="query-keyword">db.pets.find</span>(<pre class="mql-query inline">{{ JSON.stringify(metrics.query, null, 2) }}</pre>)
              </div>
            </div>
            <div class="query-parts" v-else>
              <div class="query-part">
                <span class="query-keyword">db.pets.aggregate</span>(<pre class="mql-query inline">{{ JSON.stringify(metrics.query, null, 2) }}</pre>)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="status-message">Loading Pets...</div>
    <div v-else-if="error" class="status-message error">{{ error }}</div>
    <div v-else-if="pets.length === 0" class="status-message">No pets found.</div>
    <div v-else class="dog-grid">
      <div v-for="pet in paginatedPets" :key="pet._id" class="dog-card" @click="openPetDetails(pet)">
        <div class="image-wrapper">
          <img :src="pet.image" :alt="pet.name" class="dog-image" />
          <div v-if="pet.adopted" class="adopted-badge">Adopted</div>
        </div>
        <div class="dog-info">
          <h2>{{ pet.name }}</h2>
          <p><strong>Species:</strong> {{ pet.species }}</p>
          <p><strong>Breed:</strong> {{ pet.breed }}</p>
          <p><strong>Born:</strong> {{ formatDate(pet.birthDate) }}</p>
        </div>
      </div>
    </div>

    <!-- Pagination Controls -->
    <div v-if="totalPages > 1 || totalPets > 10" class="pagination-controls">
      <div class="page-size-footer">
        <label for="pageSizeBottom">Pets per page:</label>
        <select id="pageSizeBottom" v-model="filterLimit" @change="applyFilters">
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="all">All</option>
        </select>
      </div>

      <div class="pagination-nav" v-if="totalPages > 1">
        <button 
          @click="goToPage(currentPage - 1)" 
          :disabled="currentPage === 1"
          class="nav-btn"
        >
          <span class="chevron">&lsaquo;</span> Previous
        </button>
        
        <div class="page-numbers">
          <template v-for="page in visiblePages" :key="page">
            <span v-if="page === '...'" class="dots">{{ page }}</span>
            <button 
              v-else 
              @click="goToPage(page as number)" 
              :class="{ active: currentPage === page }"
            >
              {{ page }}
            </button>
          </template>
        </div>

        <button 
          @click="goToPage(currentPage + 1)" 
          :disabled="currentPage === totalPages"
          class="nav-btn"
        >
          Next <span class="chevron">&rsaquo;</span>
        </button>
      </div>
    </div>

    <!-- Pet Detail/Edit Modal -->
    <div v-if="selectedPet" class="modal-overlay" @click.self="closePetDetails">
      <div class="modal-content">
        <button class="close-modal" @click="closePetDetails">&times;</button>
        
        <div v-if="!isEditMode" class="dog-detail-view">
          <div class="detail-header">
            <div class="detail-image-wrapper">
              <img :src="getPetImage(selectedPet)" :alt="selectedPet.name" class="detail-image" @error="handleImageError($event, selectedPet)" />
              <div v-if="selectedPet.adopted" class="detail-adopted-badge">Adopted</div>
            </div>
            <div class="header-info">
              <h1>{{ selectedPet.name }}</h1>
              <p class="detail-species-breed">{{ selectedPet.species }} • {{ selectedPet.breed }}</p>
              <button class="edit-toggle-btn" @click="startEdit">Edit Profile</button>
            </div>
          </div>
          
          <div class="detail-body">
            <div class="detail-item">
              <label>Microchip Number</label>
              <span>{{ selectedPet._id }}</span>
            </div>
            <div class="detail-item">
              <label>Status</label>
              <span :class="{ 'status-adopted': selectedPet.adopted, 'status-available': !selectedPet.adopted }">
                {{ selectedPet.adopted ? 'Adopted' : 'Available for Adoption' }}
              </span>
            </div>
            <div class="detail-item">
              <label>Born</label>
              <span>{{ formatDate(selectedPet.birthDate) }}</span>
            </div>
            <div class="detail-item full">
              <label>Description</label>
              <p class="description-text">{{ selectedPet.description || 'No description provided yet.' }}</p>
            </div>
          </div>
        </div>

        <div v-else class="dog-edit-view">
          <h1>Edit {{ selectedPet.name }}'s Profile</h1>
          <form @submit.prevent="savePetChanges" class="edit-form">
            <div class="form-row">
              <div class="form-group">
                <label for="edit-name">Name</label>
                <input id="edit-name" v-model="editForm.name" required />
              </div>
              <div class="form-group">
                <label for="edit-species">Species</label>
                <select id="edit-species" v-model="editForm.species" required>
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="edit-breed">Breed</label>
                <select id="edit-breed" v-model="editForm.breed" required>
                  <option v-for="breed in breeds" :key="breed" :value="breed">{{ breed }}</option>
                </select>
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="editForm.adopted" />
                  <span>Adopted</span>
                </label>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="edit-birthDate">Birth Date</label>
                <input id="edit-birthDate" v-model="editForm.birthDate" type="date" required />
              </div>
              <div class="form-group">
                <label for="edit-image">New Profile Picture (Optional)</label>
                <input id="edit-image" type="file" @change="handleEditImageUpload" accept="image/*" />
              </div>
            </div>

            <div class="form-group">
              <label for="edit-description">Description</label>
              <textarea id="edit-description" v-model="editForm.description" rows="4" placeholder="Tell us more about this pet..."></textarea>
            </div>

            <div v-if="updateError" class="update-error">{{ updateError }}</div>

            <div class="edit-actions">
              <button type="button" class="cancel-btn" @click="isEditMode = false">Cancel</button>
              <button type="submit" class="save-btn" :disabled="updateLoading">
                {{ updateLoading ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dog-list-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  text-align: left;
}

.filter-section {
  display: flex;
  gap: 20px;
  margin-bottom: 40px;
  padding: 24px;
  background-color: #f8fcfb;
  border-radius: 12px;
  border: 1px solid #e8edeb;
  flex-wrap: wrap;
  align-items: flex-end;
}

.atlas-search-toggle {
  min-width: 140px !important;
  flex: 0 0 auto !important;
}

.sortable-label {
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s;
  font-weight: 600;
  color: #001e2b;
  font-size: 0.9rem;
  margin-bottom: 8px;
}

.sortable-label:hover {
  color: #00ed64;
}

.switch-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.label-text {
  font-weight: 700;
  font-size: 0.8rem;
  color: #00684a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Toggle Switch Styles */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #c2cfd6;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: #00ed64;
}

input:focus + .slider {
  box-shadow: 0 0 1px #00ed64;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.slider.round {
  border-radius: 24px;
}

.slider.round:before {
  border-radius: 50%;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 180px;
}

.filter-group label {
  font-weight: 600;
  color: #001e2b;
  font-size: 0.9rem;
}

.filter-group input,
.filter-group select {
  padding: 10px 14px;
  border: 1px solid #c2cfd6;
  border-radius: 8px;
  font-size: 1rem;
  background-color: white;
  color: #001e2b;
  height: 42px;
  box-sizing: border-box;
}

.filter-group input::placeholder {
  color: #8899a6;
}

.filter-group select option {
  color: #001e2b;
  background-color: white;
}

.actions-group {
  display: flex;
  gap: 12px;
}

.apply-btn {
  background-color: #001e2b;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  height: 42px;
  transition: background-color 0.2s;
}

.apply-btn:hover {
  background-color: #003049;
}

.reset-btn {
  background-color: #f0f2f2;
  color: #001e2b;
  border: 1px solid #c2cfd6;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  height: 42px;
  transition: background-color 0.2s;
}

.reset-btn:hover {
  background-color: #e1e4e5;
}

.metrics-toggle-btn {
  background-color: #00ed64;
  color: #001e2b;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  height: 42px;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.metrics-toggle-btn:hover {
  opacity: 0.9;
}

/* Metrics Panel Styling */
.metrics-panel {
  background-color: #001e2b;
  color: white;
  padding: 32px;
  border-radius: 16px;
  margin-bottom: 40px;
  box-shadow: 0 8px 32px rgba(0, 30, 43, 0.2);
  text-align: left;
}

.metrics-panel h3 {
  margin: 0 0 24px 0;
  color: white;
  font-size: 1.4rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}

.mongodb-green {
  color: #00ed64;
}

.metrics-content {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
  text-align: left;
}

.metrics-main {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  min-width: 300px;
}

.metric-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: left;
}

.metric-card.full-width {
  grid-column: 1 / -1;
}

.label {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #8899a6;
  letter-spacing: 1px;
  font-weight: 600;
}

.value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #ffffff;
}

.value small {
  font-size: 0.9rem;
  margin-left: 4px;
  color: #8899a6;
}

.value.highlight {
  font-size: 1.2rem;
  color: #00ed64;
  font-family: 'Source Code Pro', monospace;
}

.metrics-code {
  flex: 1;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.json-display {
  background: #0a2531;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  flex: 1;
  text-align: left;
}

.query-parts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.query-keyword {
  color: #00ed64;
  font-weight: 700;
  font-family: 'Source Code Pro', monospace;
}

.mql-query {
  margin: 0;
  color: #8899a6;
  font-family: 'Source Code Pro', monospace;
  font-size: 1rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  text-align: left;
}

.mql-query.inline {
  display: inline;
  color: #ffffff;
}

.status-message {
  text-align: center;
  font-size: 1.5rem;
  padding: 50px;
  color: #00684a;
}

.error {
  color: #d32f2f;
}

.dog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 30px;
}

.dog-card {
  border: 1px solid #e8edeb;
  border-radius: 16px;
  overflow: hidden;
  background-color: white;
  box-shadow: 0 4px 12px rgba(0, 30, 43, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  text-align: left;
  position: relative;
}

.dog-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 30, 43, 0.15);
}

.image-wrapper {
  width: 100%;
  height: 240px;
  overflow: hidden;
  position: relative;
}

.dog-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.dog-card:hover .dog-image {
  transform: scale(1.05);
}

.adopted-badge {
  position: absolute;
  top: 15px;
  right: 15px;
  background-color: #001e2b;
  color: #00ed64;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  z-index: 10;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.dog-info {
  padding: 24px;
  background-color: #fff;
}

.dog-card h2 {
  margin: 0 0 12px 0;
  color: #001e2b;
  font-size: 1.75rem;
  font-weight: 700;
}

.dog-card p {
  margin: 10px 0;
  color: #4d616c;
  font-size: 1.1rem;
  line-height: 1.4;
}

.dog-card strong {
  color: #00684a;
  font-weight: 600;
}

/* Pagination Controls */
.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-top: 60px;
  padding: 30px 20px;
  border-top: 1px solid #e8edeb;
  flex-wrap: wrap;
}

.page-size-footer {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-size-footer label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #4d616c;
}

.page-size-footer select {
  padding: 8px 12px;
  border: 1px solid #c2cfd6;
  border-radius: 8px;
  font-size: 0.9rem;
  background-color: white;
  color: #001e2b;
  cursor: pointer;
  transition: border-color 0.2s;
  height: 38px;
  box-sizing: border-box;
}

.page-size-footer select:hover {
  border-color: #00ed64;
}

.pagination-nav {
  display: flex;
  align-items: center;
  gap: 24px;
}

.page-numbers {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pagination-controls button {
  background-color: white;
  color: #001e2b;
  border: 1px solid #c2cfd6;
  padding: 0;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-controls button.nav-btn {
  width: auto;
  padding: 0 16px;
  background-color: #f0f2f2;
}

.pagination-controls button:disabled {
  background-color: #f0f2f2;
  color: #8899a6;
  cursor: not-allowed;
  border-color: #e1e4e5;
}

.pagination-controls button:hover:not(:disabled) {
  border-color: #00ed64;
  color: #00ed64;
  background-color: #f8fcfb;
}

.pagination-controls button.active {
  background-color: #001e2b;
  color: white;
  border-color: #001e2b;
}

.pagination-controls button.active:hover {
  background-color: #003049;
}

.dots {
  color: #8899a6;
  font-weight: 600;
  padding: 0 4px;
}

.chevron {
  font-size: 1.4rem;
  line-height: 1;
}

.nav-btn .chevron {
  margin-top: -2px;
}

/* Modal Styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 30, 43, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background-color: white;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  border-radius: 24px;
  position: relative;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  padding: 40px;
}

.close-modal {
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  font-size: 2rem;
  color: #8899a6;
  cursor: pointer;
  line-height: 1;
  transition: color 0.2s;
}

.close-modal:hover {
  color: #001e2b;
}

/* Detail View */
.detail-header {
  display: flex;
  gap: 30px;
  margin-bottom: 40px;
  align-items: center;
}

.detail-image-wrapper {
  position: relative;
  width: 200px;
  height: 200px;
  flex-shrink: 0;
}

.detail-image {
  width: 100%;
  height: 100%;
  border-radius: 20px;
  object-fit: cover;
  box-shadow: 0 8px 16px rgba(0, 30, 43, 0.1);
}

.detail-adopted-badge {
  position: absolute;
  bottom: -10px;
  right: -10px;
  background-color: #00ed64;
  color: #001e2b;
  padding: 6px 16px;
  border-radius: 20px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0, 237, 100, 0.3);
  border: 2px solid white;
}

.header-info h1 {
  margin: 0 0 8px 0;
  font-size: 2.5rem;
  color: #001e2b;
}

.detail-species-breed {
  font-size: 1.25rem;
  color: #00684a;
  font-weight: 600;
  margin-bottom: 20px;
}

.edit-toggle-btn {
  background-color: #f0f2f2;
  color: #001e2b;
  border: 1px solid #c2cfd6;
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.edit-toggle-btn:hover {
  background-color: #e8edeb;
  border-color: #001e2b;
}

.detail-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item.full {
  grid-column: 1 / -1;
}

.detail-item label {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #8899a6;
  letter-spacing: 1px;
  font-weight: 700;
}

.detail-item span {
  font-size: 1.2rem;
  color: #001e2b;
  font-weight: 500;
}

.status-adopted {
  color: #00684a !important;
  font-weight: 700 !important;
}

.status-available {
  color: #001e2b !important;
}

.description-text {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #4d616c;
  margin: 0;
  white-space: pre-wrap;
}

/* Edit View */
.dog-edit-view h1 {
  margin-bottom: 30px;
  font-size: 2rem;
  color: #001e2b;
}

.edit-form {
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

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #001e2b;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #c2cfd6;
  border-radius: 8px;
  font-size: 1rem;
  background-color: white;
  color: #001e2b;
  box-sizing: border-box;
}

.checkbox-group {
  display: flex;
  align-items: center;
  padding-top: 35px;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  margin: 0 !important;
}

.checkbox-label input {
  width: 20px;
  height: 20px;
}

.form-group textarea {
  resize: vertical;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 20px;
}

.save-btn {
  background-color: #001e2b;
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.save-btn:hover:not(:disabled) {
  background-color: #003049;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-btn {
  background-color: transparent;
  color: #4d616c;
  border: 1px solid #c2cfd6;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background-color: #f0f2f2;
  color: #001e2b;
}

.update-error {
  color: #d32f2f;
  font-weight: 600;
  margin-top: 10px;
}

@media (max-width: 600px) {
  .detail-header {
    flex-direction: column;
    text-align: center;
  }
  
  .detail-body {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    flex-direction: column;
  }
}
</style>
