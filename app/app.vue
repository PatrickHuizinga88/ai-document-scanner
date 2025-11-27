<script setup>
const supabase = useSupabaseClient()
const fileInput = ref(null)
const isDragging = ref(false)
const loading = ref(false)
const result = ref(null)
const error = ref(null)

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/tiff': ['.tiff', '.tif'],
}

const handleFileSelect = async (event) => {
  const file = event.target.files?.[0]
  if (file) {
    await scanDocument(file)
  }
}

const handleDrop = async (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files?.[0]

  if (file && isValidFileType(file.type)) {
    await scanDocument(file)
  } else {
    error.value = 'Please upload a valid document (PDF, JPG, PNG, WEBP, or TIFF)'
  }
}

const isValidFileType = (type) => {
  return Object.keys(ACCEPTED_FILE_TYPES).includes(type)
}

const scanDocument = async (file) => {
  loading.value = true
  error.value = null
  result.value = null

  try {
    // Upload file to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

    if (uploadError) throw uploadError

    // Get signed URL (expires in 5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(uploadData.path, 300)

    if (signedUrlError) throw signedUrlError

    // Send to API endpoint
    const response = await $fetch('/api/scan-document', {
      method: 'POST',
      body: {
        documentUrl: signedUrlData.signedUrl,
        documentType: file.type
      }
    })

    if (response.error) {
      error.value = response.error
    } else {
      result.value = response
    }

    // Optional: Delete the file after processing
    // await supabase.storage
    //     .from('documents')
    //     .remove([uploadData.path])

  } catch (err) {
    error.value = err.message || 'Failed to scan document. Please try again.'
  } finally {
    loading.value = false
  }
}

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '-'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

const reset = () => {
  result.value = null
  error.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
    <div class="mx-auto max-w-4xl">
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-slate-900">Document Scanner</h1>
        <p class="mt-2 text-slate-600">Upload any document to extract structured information</p>
      </div>

      <!-- Upload Area -->
      <div
          v-if="!result && !loading"
          class="relative rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center transition-all hover:border-slate-400"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          :class="{ 'border-blue-400 bg-blue-50': isDragging }"
      >
        <input
            ref="fileInput"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.tif"
            class="hidden"
            @change="handleFileSelect"
        />

        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <svg class="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
        </div>

        <p class="mb-2 text-lg font-medium text-slate-700">
          Drop your document here or
          <button @click="$refs.fileInput.click()" class="text-blue-600 hover:text-blue-700">
            browse
          </button>
        </p>
        <p class="text-sm text-slate-500">PDF, JPG, PNG, WEBP, or TIFF files</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="rounded-2xl bg-white p-12 text-center">
        <div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
        <p class="text-lg font-medium text-slate-700">Scanning document...</p>
        <p class="mt-1 text-sm text-slate-500">This may take a few moments</p>
      </div>

      <!-- Results -->
      <div v-if="result && !loading" class="space-y-4">
        <div class="flex items-center justify-between rounded-xl bg-white p-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <p class="font-medium text-slate-900">Scan Complete</p>
              <p class="text-sm text-slate-500">{{ result.documentType || 'Document' }}</p>
            </div>
          </div>
          <button
              @click="reset"
              class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            Scan New Document
          </button>
        </div>

        <div class="rounded-2xl bg-white p-6 shadow-sm">
          <h2 class="mb-4 text-xl font-semibold text-slate-900">Extracted Information</h2>

          <!-- Document Details -->
          <div v-if="result.invoiceNumber || result.date || result.dueDate" class="mb-6 grid gap-4 sm:grid-cols-3">
            <div v-if="result.invoiceNumber" class="rounded-lg bg-slate-50 p-4">
              <p class="text-sm text-slate-500">Document Number</p>
              <p class="mt-1 font-medium text-slate-900">{{ result.invoiceNumber }}</p>
            </div>
            <div v-if="result.date" class="rounded-lg bg-slate-50 p-4">
              <p class="text-sm text-slate-500">Date</p>
              <p class="mt-1 font-medium text-slate-900">{{ result.date }}</p>
            </div>
            <div v-if="result.dueDate" class="rounded-lg bg-slate-50 p-4">
              <p class="text-sm text-slate-500">Due Date</p>
              <p class="mt-1 font-medium text-slate-900">{{ result.dueDate }}</p>
            </div>
          </div>

          <!-- Vendor & Customer -->
          <div v-if="result.vendor || result.customer" class="mb-6 grid gap-4 sm:grid-cols-2">
            <div v-if="result.vendor?.name" class="rounded-lg border border-slate-200 p-4">
              <p class="mb-2 text-sm font-medium text-slate-500">Vendor</p>
              <p class="font-medium text-slate-900">{{ result.vendor.name }}</p>
              <p v-if="result.vendor.address" class="mt-1 text-sm text-slate-600">{{ result.vendor.address }}</p>
              <div v-if="result.vendor.email || result.vendor.phone" class="mt-2 space-y-1">
                <p v-if="result.vendor.email" class="text-sm text-slate-600">{{ result.vendor.email }}</p>
                <p v-if="result.vendor.phone" class="text-sm text-slate-600">{{ result.vendor.phone }}</p>
              </div>
            </div>
            <div v-if="result.customer?.name" class="rounded-lg border border-slate-200 p-4">
              <p class="mb-2 text-sm font-medium text-slate-500">Customer</p>
              <p class="font-medium text-slate-900">{{ result.customer.name }}</p>
              <p v-if="result.customer.address" class="mt-1 text-sm text-slate-600">{{ result.customer.address }}</p>
            </div>
          </div>

          <!-- Line Items -->
          <div v-if="result.items?.length" class="mb-6">
            <p class="mb-3 text-sm font-medium text-slate-500">Line Items</p>
            <div class="overflow-hidden rounded-lg border border-slate-200">
              <table class="min-w-full divide-y divide-slate-200">
                <thead class="bg-slate-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-slate-500">Description</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-slate-500">Qty</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-slate-500">Unit Price</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-slate-500">Total</th>
                </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 bg-white">
                <tr v-for="(item, index) in result.items" :key="index">
                  <td class="px-4 py-3 text-sm text-slate-900">{{ item.description }}</td>
                  <td class="px-4 py-3 text-right text-sm text-slate-600">{{ item.quantity || '-' }}</td>
                  <td class="px-4 py-3 text-right text-sm text-slate-600">{{ formatCurrency(item.unitPrice) }}</td>
                  <td class="px-4 py-3 text-right text-sm font-medium text-slate-900">{{
                      formatCurrency(item.total)
                    }}
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Totals -->
          <div v-if="result.total" class="mb-6 rounded-lg bg-slate-50 p-4">
            <div class="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{{ formatCurrency(result.subtotal) }}</span>
            </div>
            <div v-if="result.tax" class="mt-2 flex justify-between text-sm text-slate-600">
              <span>Tax</span>
              <span>{{ formatCurrency(result.tax) }}</span>
            </div>
            <div class="mt-2 flex justify-between border-t border-slate-200 pt-2 text-lg font-semibold text-slate-900">
              <span>Total</span>
              <span>{{ formatCurrency(result.total) }} {{ result.currency || '' }}</span>
            </div>
          </div>

          <!-- Payment Details -->
          <div v-if="result.paymentDetails?.iban || result.paymentDetails?.bankName"
               class="mb-6 rounded-lg border border-slate-200 p-4">
            <p class="mb-2 text-sm font-medium text-slate-500">Payment Details</p>
            <p v-if="result.paymentDetails.bankName" class="text-sm text-slate-900">{{
                result.paymentDetails.bankName
              }}</p>
            <p v-if="result.paymentDetails.iban" class="mt-1 font-mono text-sm text-slate-600">
              {{ result.paymentDetails.iban }}</p>
          </div>

          <!-- Additional Information -->
          <div v-if="result.additionalInfo" class="rounded-lg bg-slate-50 p-4">
            <p class="mb-2 text-sm font-medium text-slate-500">Additional Information</p>
            <p class="text-sm text-slate-900">{{ result.additionalInfo }}</p>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="rounded-2xl bg-red-50 p-6 text-center">
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </div>
        <p class="font-medium text-red-900">{{ error }}</p>
        <button @click="reset" class="mt-4 text-sm text-red-600 hover:text-red-700">Try again</button>
      </div>
    </div>
  </div>
</template>