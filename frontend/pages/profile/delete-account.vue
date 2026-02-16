<template>
    <div >
        <div class=" flex items-center justify-center py-8">
            <div
                class="flex bg-white rounded-lg shadow-lg overflow-hidden max-w-6xl w-full mx-4 border border-gray-300">

                <ProfileSidebar />

                <main class="flex-1 p-8">
                    <div class="p-8 max-w-2xl mx-auto">
                        <!-- หัวข้อหลัก -->
                        <h1 class="text-2xl font-bold text-gray-900 mb-6">
                            เลือกข้อมูลที่คุณต้องการจะลบ
                        </h1>

                        <!-- เส้นคั่นกลาง -->
                        <hr class="border-t border-gray-300 mb-8" />

                        <!-- รายการข้อมูลที่ให้เลือก (Checkbox/Radio List) -->
                        <div class="space-y-6">
                            <!-- เลือกทั้งหมด -->
                            <label class="flex items-center space-x-3 cursor-pointer group">
                                <div class="w-5 h-5 border-2 border-gray-400 rounded-full flex items-center justify-center group-hover:border-blue-500 transition-colors">
                                    <input type="checkbox" class="sr-only peer" v-model="selectAll" @change="toggleAll">
                                    <div class="w-3 h-3 bg-blue-500 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                </div>
                                <span class="text-lg font-medium text-gray-800">เลือกทั้งหมด</span>
                            </label>

                            <!-- รายการข้อมูลย่อยที่จะลบ -->
                            <div class="ml-4 space-y-4">
                                <label v-for="(item, index) in dataItems" :key="index" class="flex items-center space-x-3 cursor-pointer group">
                                    <div class="w-5 h-5 border-2 border-gray-400 rounded-full flex items-center justify-center group-hover:border-blue-500 transition-colors">
                                        <!-- แก้ไข :value ให้เป็น item.id -->
                                        <input type="checkbox" class="sr-only peer" v-model="selectedItems" :value="item.id">
                                        <div class="w-3 h-3 bg-blue-500 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                    </div>
                                    <span class="text-gray-800 font-medium">{{ item.name }}</span>
                                </label>
                            </div>

                            <!-- รับรายละเอียดทาง Email -->
                            <label class="flex items-center space-x-3 cursor-pointer group pt-4">
                                <div class="w-5 h-5 border-2 border-gray-400 rounded-full flex items-center justify-center group-hover:border-blue-500 transition-colors">
                                    <input type="checkbox" class="sr-only peer" v-model="sendEmail">
                                    <div class="w-3 h-3 bg-blue-500 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                </div>
                                <span class="text-gray-700">ต้องการรับรายละเอียดข้อมูลที่ลบทาง Email หรือไม่</span>
                            </label>
                        </div>

                        <!-- ปุ่มลบ -->
                        <div class="flex justify-end mt-12">
                            <button 
                                @click="handleDelete"
                                :disabled="isLoading || selectedItems.length === 0"
                                class="bg-red-600 text-white px-10 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md text-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                            >
                                <!-- ถ้ากำลังโหลดให้ขึ้นข้อความอีกแบบ -->
                                <span v-if="isLoading">กำลังดำเนินการ...</span>
                                <span v-else>ลบ</span>
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>

        <VehicleModal :show="isModalOpen" @close="closeAndRefresh" />
    </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const selectAll = ref(false)
const selectedItems = ref([]) // เก็บ index หรือ id ของสิ่งที่จะลบ
const sendEmail = ref(false)
const isLoading = ref(false) // เพิ่มสถานะ Loading

// รายละเอียดรายการย่อย (แนะนำว่าในใช้งานจริงควรมี 'id')
const dataItems = ref([
    { id: 1, name: 'ประวัติการเข้าชม' },
    { id: 2, name: 'ข้อมูลส่วนตัวบางส่วน' },
    { id: 3, name: 'รายการโปรด' },
    { id: 4, name: 'ข้อมูลการค้นหา' },
    { id: 5, name: 'คุกกี้และแคช' }
])

const toggleAll = () => {
    if (selectAll.value) {
        // เก็บเป็น ID เพื่อส่งไปให้ Backend
        selectedItems.value = dataItems.value.map(item => item.id)
    } else {
        selectedItems.value = []
    }
}

watch(selectedItems, (newVal) => {
    if (newVal.length === dataItems.value.length) {
        selectAll.value = true
    } else {
        selectAll.value = false
    }
}, { deep: true })

const handleDelete = async () => {
    if (selectedItems.value.length === 0) {
        alert('กรุณาเลือกข้อมูลที่ต้องการลบอย่างน้อย 1 รายการ')
        return
    }

    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลที่เลือก (${selectedItems.value.length} รายการ)?`)) {
        try {
            isLoading.value = true // เริ่มต้นการโหลด
      
            // การเชื่อมต่อ Backend (ตัวอย่างใช้ $fetch ของ Nuxt)
            const response = await $fetch('/api/delete-data', {
                method: 'POST',
                body: {
                    itemIds: selectedItems.value,
                    endEmailConfirmation: sendEmail.value
                }
            })

            // ถ้าลบสำเร็จ
            alert('ลบข้อมูลเรียบร้อยแล้ว')
            // อาจจะทำการอัปเดต UI หรือ Reset ค่า
            selectedItems.value = []
            selectAll.value = false
      
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการลบ:', error)
            alert('ไม่สามารถลบข้อมูลได้ในขณะนี้ กรุณาลองใหม่ภายหลัง')
        } finally {
            isLoading.value = false // สิ้นสุดการโหลด
        }
    }
}
</script>