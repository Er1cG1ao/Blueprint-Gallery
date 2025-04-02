import { useState, useEffect } from "react";
import { fetchPendingSubmissions, fetchApprovedSubmissions, fetchRejectedSubmissions } from "../utils/fetchSupabase";
import type { IASubmission } from "../utils/supabaseSubmission";
import { supabase } from "../utils/supabase";
import { X, Edit, Save, Trash2, Check, ArrowUp, ArrowDown, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { TestEmail } from "./TestEmail";

interface AdminPanelProps {
    ias: IASubmission[];
}

const AdminPanel = ({ ias }: AdminPanelProps) => {
    const [activeTab, setActiveTab] = useState("home");
    const [pendingIAs, setPendingIAs] = useState<IASubmission[]>([]);
    const [approvedIAs, setApprovedIAs] = useState<IASubmission[]>([]);
    const [rejectedIAs, setRejectedIAs] = useState<IASubmission[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<IASubmission>>({
        title: "",
        description: "",
        material: [],
        color: [],
        function: [],
        imageUrls: []
    });
    const [removingImage, setRemovingImage] = useState<string | null>(null);
    const [editingSubmission, setEditingSubmission] = useState<IASubmission | null>(null);
    const [formData, setFormData] = useState<Partial<IASubmission>>({
        title: "",
        description: "",
        material: [],
        color: [],
        function: [],
        imageUrls: []
    });
    const [isImageDeleting, setIsImageDeleting] = useState(false);

    // Available filter categories for tag editing
    const filterCategories = {
        material: ["Alloy", "Wood", "Plastic", "Glass", "Fabric", "Composite"],
        color: ["Red", "Blue", "Green", "Black", "White", "Yellow"],
        function: [
          "Organization & Storage",
          "Life Improvement & Decor",
          "Health & Wellness",
          "Innovative Gadgets & Tools",
          "Accessibility & Mobility Solutions"
        ]
    };

    useEffect(() => {
        // Fetch IAs for the active tab
        const fetchIAs = async () => {
            setLoading(true);
            try {
                // Always fetch counts for dashboard
                const pendingData = await fetchPendingSubmissions();
                setPendingIAs(pendingData);
                
                const approvedData = await fetchApprovedSubmissions();
                setApprovedIAs(approvedData);
                
                const rejectedData = await fetchRejectedSubmissions();
                setRejectedIAs(rejectedData);
            } catch (error) {
                console.error("Error fetching IAs:", error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchIAs();
    }, [activeTab]);

    const handleApproveIA = async (id: string | undefined) => {
        if (!id) {
            alert("Error: Missing submission ID");
            return;
        }
        
        if (confirm("Are you sure you want to approve this submission?")) {
            try {
                console.log(`Approving IA with ID: ${id}`);
                
                // Get the admin password from environment
                const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
                
                // Call the API endpoint with the correct URL
                const response = await fetch("/api/approveIA", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, password: adminPassword })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to approve submission");
                }
                
                // Remove from pending list
                setPendingIAs(prev => prev.filter(ia => ia.id !== id));
                alert("IA approved successfully!");
                
            } catch (error) {
                console.error("Error approving IA:", error);
                alert(`Error approving IA: ${error instanceof Error ? error.message : "Please try again"}`);
            }
        }
    };

    const handleRejectIA = async (id: string | undefined) => {
        if (!id) {
            alert("Error: Missing submission ID");
            return;
        }
        
        if (confirm("Are you sure you want to reject this submission? This will mark it as rejected.")) {
            try {
                console.log(`Rejecting IA with ID: ${id}`);
                
                // Get the admin password from environment
                const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
                
                // Call the API endpoint
                const response = await fetch("/api/rejectIA", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, password: adminPassword })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to reject submission");
                }
                
                // Remove from pending list
                setPendingIAs(prev => prev.filter(ia => ia.id !== id));
                alert("IA rejected successfully!");
                
            } catch (error) {
                console.error("Error rejecting IA:", error);
                alert(`Error rejecting IA: ${error instanceof Error ? error.message : "Please try again"}`);
            }
        }
    };

    const handleMoveToPending = async (id: string | undefined) => {
        if (!id) {
            alert("Error: Missing submission ID");
            return;
        }
        
        if (confirm("Are you sure you want to move this submission back to pending review?")) {
            try {
                console.log(`Moving submission to pending: ${id}`);
                
                // Get the admin password from environment
                const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
                
                // Update submission status to pending
                const { error } = await supabase
                    .from('submissions')
                    .update({ status: 'pending' })
                    .eq('id', id);
                
                if (error) {
                    throw new Error(`Failed to update submission status: ${error.message}`);
                }
                
                // Update UI by removing from rejected list
                setRejectedIAs(prev => prev.filter(ia => ia.id !== id));
                alert("Submission moved to pending successfully!");
                
            } catch (error) {
                console.error("Error moving submission to pending:", error);
                alert(`Error: ${error instanceof Error ? error.message : "Please try again"}`);
            }
        }
    };

    const handlePermanentDelete = async (id: string | undefined) => {
        if (!id) {
            alert("Error: Missing submission ID");
            return;
        }
        
        if (confirm("Are you sure you want to permanently delete this submission? This cannot be undone.")) {
            try {
                setIsDeleting(id);
                console.log(`Permanently deleting submission with ID: ${id}`);
                
                // Get the admin password from environment
                const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
                
                // 1. First, get the submission details to find file paths
                const { data: submission, error: fetchError } = await supabase
                    .from('submissions')
                    .select('pdfUrl, imageUrls')
                    .eq('id', id)
                    .single();
                
                if (fetchError) {
                    throw new Error(`Failed to fetch submission details: ${fetchError.message}`);
                }
                
                // 2. Delete files from storage if they exist
                if (submission) {
                    // Prepare an array of all file URLs
                    const filesToDelete = [
                        submission.pdfUrl,
                        ...(submission.imageUrls || [])
                    ].filter(Boolean);
                    
                    for (const fileUrl of filesToDelete) {
                        // Extract path from URL - this is a simplified approach
                        const pathMatch = fileUrl.match(/\/([^\/]+)\/([^?]+)/);
                        if (pathMatch && pathMatch.length >= 3) {
                            const path = pathMatch[2];
                            console.log(`Attempting to delete file: ${path}`);
                            
                            try {
                                await supabase.storage
                                    .from('submissions')
                                    .remove([path]);
                            } catch (storageError) {
                                console.error(`Error deleting file ${path}:`, storageError);
                                // Continue deleting other files even if one fails
                            }
                        }
                    }
                }
                
                // 3. Delete the record from the database
                const { error: deleteError } = await supabase
                    .from('submissions')
                    .delete()
                    .eq('id', id);
                
                if (deleteError) {
                    throw new Error(`Failed to delete submission: ${deleteError.message}`);
                }
                
                // 4. Update the UI
                setRejectedIAs(prev => prev.filter(ia => ia.id !== id));
                alert("Submission permanently deleted!");
                
            } catch (error) {
                console.error("Error deleting submission:", error);
                alert(`Error deleting submission: ${error instanceof Error ? error.message : "Please try again"}`);
            } finally {
                setIsDeleting(null);
            }
        }
    };

    // New functions for editing submission details
    const handleEditSubmission = (submission: IASubmission) => {
        console.log('Starting edit for submission:', submission);
        
        // Make a copy of the submission data for editing
        const initialFormData = {
            title: submission.title || '',
            description: submission.description || '',
            material: submission.material ? [...submission.material] : [],
            color: submission.color ? [...submission.color] : [],
            function: submission.function ? [...submission.function] : [],
            imageUrls: submission.imageUrls ? [...submission.imageUrls] : []
        };
        
        console.log('Setting initial form data:', initialFormData);
        
        setEditingId(submission.id || null);
        setEditingSubmission(submission);
        setFormData(initialFormData);
        setEditFormData(initialFormData);
    };

    const handleCancelEdit = () => {
        console.log('Canceling edit');
        setEditingId(null);
        setEditingSubmission(null);
        setFormData({
            title: "",
            description: "",
            material: [],
            color: [],
            function: [],
            imageUrls: []
        });
        setEditFormData({
            title: "",
            description: "",
            material: [],
            color: [],
            function: [],
            imageUrls: []
        });
    };

    const handleUpdateSubmission = async (e: React.FormEvent<Element>) => {
        e.preventDefault();
        
        if (!editingSubmission || !editingSubmission.id) return;
        
        setIsUpdating(true);
        
        try {
            // Get admin password from session storage
            const adminPassword = window.sessionStorage.getItem('adminPassword') || '';
            
            console.log('Using admin password:', adminPassword ? '[Password found]' : '[No password]');
            
            // Log the data being sent to the API
            console.log('Sending update data:', {
                id: editingSubmission.id,
                title: editFormData.title,
                description: editFormData.description,
                material: editFormData.material,
                color: editFormData.color,
                function: editFormData.function,
                imageUrls: editFormData.imageUrls
            });
            
            // Use the correct API endpoint path based on the route config
            const response = await fetch('/api/updateSubmission', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: editingSubmission.id,
                    title: editFormData.title,
                    description: editFormData.description,
                    material: editFormData.material,
                    color: editFormData.color,
                    function: editFormData.function,
                    imageUrls: editFormData.imageUrls,
                    password: adminPassword
                }),
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                try {
                    // Try to parse as JSON
                    const errorJson = JSON.parse(errorText);
                    throw new Error(`Error updating submission: ${errorJson.error || 'Unknown error'}`);
                } catch (jsonError) {
                    // If not JSON, use text
                    throw new Error(`Server returned non-JSON response (${response.status}: ${response.statusText})`);
                }
            }
            
            const data = await response.json();
            
            // Update the list with the edited data based on submission status
            if (editingSubmission.status === 'approved') {
                setApprovedIAs(
                    approvedIAs.map((sub) =>
                        sub.id === editingSubmission.id
                            ? { ...sub, ...editFormData }
                            : sub
                    )
                );
            } else if (editingSubmission.status === 'pending') {
                setPendingIAs(
                    pendingIAs.map((sub) =>
                        sub.id === editingSubmission.id
                            ? { ...sub, ...editFormData }
                            : sub
                    )
                );
            }
            
            setEditingId(null);
            setEditingSubmission(null);
            setFormData({
                title: "",
                description: "",
                material: [],
                color: [],
                function: [],
                imageUrls: []
            });
            setEditFormData({
                title: "",
                description: "",
                material: [],
                color: [],
                function: [],
                imageUrls: []
            });
            toast.success('Submission updated successfully!');
        } catch (error) {
            console.error('Update error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to update submission');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        console.log(`Form field changed: ${name} = ${value}`);
        
        // Fix: Clone the previous state first, then modify it
        setEditFormData(prev => {
            // Create a deep copy of the previous state
            const prevCopy = JSON.parse(JSON.stringify(prev));
            
            // Update the specific field
            const updated = {
                ...prevCopy,
                [name]: value
            };
            
            console.log('Updated editFormData:', updated);
            return updated;
        });
    };

    const handleTagToggle = (category: string, value: string) => {
        console.log(`Toggling tag: ${category} - ${value}`);
        
        // Fix: Clone the previous state first, then modify it
        setEditFormData(prev => {
            // Create a deep copy of the previous state
            const prevCopy = JSON.parse(JSON.stringify(prev));
            
            // Ensure we're working with an array
            const currentTags = Array.isArray(prevCopy[category]) 
                ? prevCopy[category] 
                : [];
            
            // If tag exists, remove it; otherwise, add it
            const updatedTags = currentTags.includes(value) 
                ? currentTags.filter(tag => tag !== value)
                : [...currentTags, value];
            
            // Create the new state
            const updated = {
                ...prevCopy,
                [category]: updatedTags
            };
            
            console.log(`Updated ${category} tags:`, updatedTags);
            console.log('Updated editFormData:', updated);
            return updated;
        });
    };

    const handleDeleteImage = async (imageUrl: string) => {
        if (!editingSubmission) return;

        setIsImageDeleting(true);

        try {
            const adminPassword = window.sessionStorage.getItem('adminPassword') || '';
            
            // Use the API endpoint in the routes directory structure
            const response = await fetch('/api/deleteSubmissionImage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: editingSubmission.id,
                    imageUrl,
                    password: adminPassword
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    // Try to parse as JSON
                    const errorJson = JSON.parse(errorText);
                    throw new Error(`Error deleting image: ${errorJson.error || 'Unknown error'}`);
                } catch (jsonError) {
                    // If not JSON, use text
                    throw new Error(`Server returned non-JSON response (${response.status}: ${response.statusText})`);
                }
            }

            const data = await response.json();
            
            // Update UI with the new image list
            const updatedImageUrls = formData.imageUrls?.filter(url => url !== imageUrl) || [];
            
            // Update both state variables
            setFormData({
                ...formData,
                imageUrls: updatedImageUrls
            });
            
            setEditFormData({
                ...editFormData,
                imageUrls: updatedImageUrls
            });

            // If we're editing the same submission that's in the approved list, update that too
            if (editingSubmission.status === 'approved') {
                setApprovedIAs(
                    approvedIAs.map((sub) =>
                        sub.id === editingSubmission.id
                            ? { ...sub, imageUrls: updatedImageUrls }
                            : sub
                    )
                );
            } else if (editingSubmission.status === 'pending') {
                setPendingIAs(
                    pendingIAs.map((sub) =>
                        sub.id === editingSubmission.id
                            ? { ...sub, imageUrls: updatedImageUrls }
                            : sub
                    )
                );
            }

            toast.success('Image deleted successfully!');
        } catch (error) {
            console.error('Image deletion error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete image');
        } finally {
            setIsImageDeleting(false);
        }
    };

    const handleMoveImage = (submissionId: string, imageUrl: string, direction: 'up' | 'down') => {
        // First find which list the submission belongs to
        const approvedSubmission = approvedIAs.find(ia => ia.id === submissionId);
        const pendingSubmission = pendingIAs.find(ia => ia.id === submissionId);
        
        if (approvedSubmission) {
            // Update the approved list
            setApprovedIAs(prev => {
                return prev.map(ia => {
                    if (ia.id !== submissionId) return ia;
                    
                    const newImageUrls = [...ia.imageUrls];
                    const currentIndex = newImageUrls.indexOf(imageUrl);
                    
                    if (currentIndex === -1) return ia;
                    
                    if (direction === 'up' && currentIndex > 0) {
                        // Swap with previous image
                        [newImageUrls[currentIndex], newImageUrls[currentIndex - 1]] = 
                        [newImageUrls[currentIndex - 1], newImageUrls[currentIndex]];
                    } else if (direction === 'down' && currentIndex < newImageUrls.length - 1) {
                        // Swap with next image
                        [newImageUrls[currentIndex], newImageUrls[currentIndex + 1]] = 
                        [newImageUrls[currentIndex + 1], newImageUrls[currentIndex]];
                    }
                    
                    // If we're currently editing this submission, update both form data variables
                    if (editingId === submissionId) {
                        setFormData(prev => ({
                            ...prev,
                            imageUrls: newImageUrls
                        }));
                        
                        setEditFormData(prev => ({
                            ...prev,
                            imageUrls: newImageUrls
                        }));
                    }
                    
                    return {
                        ...ia,
                        imageUrls: newImageUrls
                    };
                });
            });
        } else if (pendingSubmission) {
            // Update the pending list
            setPendingIAs(prev => {
                return prev.map(ia => {
                    if (ia.id !== submissionId) return ia;
                    
                    const newImageUrls = [...ia.imageUrls];
                    const currentIndex = newImageUrls.indexOf(imageUrl);
                    
                    if (currentIndex === -1) return ia;
                    
                    if (direction === 'up' && currentIndex > 0) {
                        // Swap with previous image
                        [newImageUrls[currentIndex], newImageUrls[currentIndex - 1]] = 
                        [newImageUrls[currentIndex - 1], newImageUrls[currentIndex]];
                    } else if (direction === 'down' && currentIndex < newImageUrls.length - 1) {
                        // Swap with next image
                        [newImageUrls[currentIndex], newImageUrls[currentIndex + 1]] = 
                        [newImageUrls[currentIndex + 1], newImageUrls[currentIndex]];
                    }
                    
                    // If we're currently editing this submission, update both form data variables
                    if (editingId === submissionId) {
                        setFormData(prev => ({
                            ...prev,
                            imageUrls: newImageUrls
                        }));
                        
                        setEditFormData(prev => ({
                            ...prev,
                            imageUrls: newImageUrls
                        }));
                    }
                    
                    return {
                        ...ia,
                        imageUrls: newImageUrls
                    };
                });
            });
        }
    };

    // Debugging: Log the current editing state
    console.log('Debug - Current editing state:', {
        editingId,
        formData,
        editFormData,
        editingSubmission: editingSubmission ? {
            id: editingSubmission.id,
            title: editingSubmission.title
        } : null
    });

    return (
        <div className="flex">
            {/* Left Sidebar Navigation */}
            <nav className="w-40 h-screen bg-gray-200 flex flex-col items-center py-4 relative">
                <div className="flex flex-col items-center">
                    <button onClick={() => setActiveTab("home")} className={`mb-4 border cursor-pointer rounded-lg p-2 w-34 text-center flex items-center justify-center ${activeTab === "home" ? "bg-blue-100 border-blue-300" : ""} hover:bg-gray-100 transition-colors`}>
                        <span className="mr-2">🏠</span> Main panel
                    </button>
                    <button onClick={() => setActiveTab("approved")} className={`mb-4 border cursor-pointer rounded-lg p-2 w-34 text-center flex items-center justify-center ${activeTab === "approved" ? "bg-green-100 border-green-300" : ""} hover:bg-gray-100 transition-colors`}>
                        <span className="mr-2">✅</span> Approved
                    </button>
                    <button onClick={() => setActiveTab("pending")} className={`mb-4 border cursor-pointer rounded-lg p-2 w-34 text-center flex items-center justify-center ${activeTab === "pending" ? "bg-yellow-100 border-yellow-300" : ""} hover:bg-gray-100 transition-colors`}>
                        <span className="mr-2">⏳</span> Pending
                    </button>
                    <button onClick={() => setActiveTab("rejected")} className={`mb-4 border cursor-pointer rounded-lg p-2 w-34 text-center flex items-center justify-center ${activeTab === "rejected" ? "bg-red-100 border-red-300" : ""} hover:bg-gray-100 transition-colors`}>
                        <span className="mr-2">🗑️</span> Rejected
                    </button>
                    <button onClick={() => setActiveTab("classification")} className={`mb-4 border cursor-pointer rounded-lg p-2 w-34 text-center flex items-center justify-center ${activeTab === "classification" ? "bg-purple-100 border-purple-300" : ""} hover:bg-gray-100 transition-colors`}>
                        <span className="mr-2">📂</span> Classification
                    </button>
                </div>
                
                <button
                    className="absolute bottom-4 p-2 bg-red-500 cursor-pointer text-white rounded w-34 text-center hover:bg-red-600 transition-colors"
                    onClick={() => {
                        localStorage.removeItem("admin_authenticated");
                        localStorage.removeItem("admin_auth_expiration");
                        window.location.href = "/"; // Redirect to homepage
                    }}
                >
                    Logout
                </button>
            </nav>

            {/* Main Content - Render based on activeTab */}
            <div className="flex-1 p-6 overflow-y-auto">
                {activeTab === "home" && (
                    <div>
                        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                        <p className="mb-4">Welcome to the admin panel.</p>
                        
                        <div className="mb-8">
                            <TestEmail />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                            <div className="bg-blue-100 p-4 rounded shadow">
                                <h2 className="font-bold">Total IAs</h2>
                                <p className="text-2xl">{pendingIAs.length + approvedIAs.length + rejectedIAs.length}</p>
                                
                                <div className="mt-4">
                                    <h3 className="text-sm font-medium mb-2">All Submissions</h3>
                                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                                        {[...pendingIAs, ...approvedIAs, ...rejectedIAs].slice(0, 10).map((ia) => (
                                            <div key={ia.id} className="bg-white rounded shadow-sm p-1 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab(ia.status === 'pending' ? 'pending' : ia.status === 'approved' ? 'approved' : 'rejected')}>
                                                {ia.pdfUrl ? (
                                                    <div className="h-24 flex items-center justify-center overflow-hidden bg-gray-100 rounded mb-1">
                                                        <object data={ia.pdfUrl + "#page=1&view=FitH"} type="application/pdf" className="w-full h-full">
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                                                                PDF
                                                            </div>
                                                        </object>
                                                    </div>
                                                ) : (
                                                    <div className="h-24 flex items-center justify-center bg-gray-100 rounded mb-1">
                                                        <span className="text-gray-400 text-xs">No PDF</span>
                                                    </div>
                                                )}
                                                <p className="text-xs truncate" title={ia.title}>{ia.title}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-yellow-100 p-4 rounded shadow">
                                <h2 className="font-bold">Pending Approvals</h2>
                                <p className="text-2xl">{pendingIAs.length}</p>
                                
                                <div className="mt-4">
                                    <h3 className="text-sm font-medium mb-2">Waiting Review</h3>
                                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                                        {pendingIAs.slice(0, 10).map((ia) => (
                                            <div key={ia.id} className="bg-white rounded shadow-sm p-1 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('pending')}>
                                                {ia.pdfUrl ? (
                                                    <div className="h-24 flex items-center justify-center overflow-hidden bg-gray-100 rounded mb-1">
                                                        <object data={ia.pdfUrl + "#page=1&view=FitH"} type="application/pdf" className="w-full h-full">
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                                                                PDF
                                                            </div>
                                                        </object>
                                                    </div>
                                                ) : (
                                                    <div className="h-24 flex items-center justify-center bg-gray-100 rounded mb-1">
                                                        <span className="text-gray-400 text-xs">No PDF</span>
                                                    </div>
                                                )}
                                                <p className="text-xs truncate" title={ia.title}>{ia.title}</p>
                                            </div>
                                        ))}
                                        {pendingIAs.length === 0 && (
                                            <div className="col-span-2 text-center py-6 text-gray-500 text-sm">
                                                No pending submissions
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-green-100 p-4 rounded shadow">
                                <h2 className="font-bold">Approved IAs</h2>
                                <p className="text-2xl">{approvedIAs.length}</p>
                                
                                <div className="mt-4">
                                    <h3 className="text-sm font-medium mb-2">Published</h3>
                                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                                        {approvedIAs.slice(0, 10).map((ia) => (
                                            <div key={ia.id} className="bg-white rounded shadow-sm p-1 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('approved')}>
                                                {ia.pdfUrl ? (
                                                    <div className="h-24 flex items-center justify-center overflow-hidden bg-gray-100 rounded mb-1">
                                                        <object data={ia.pdfUrl + "#page=1&view=FitH"} type="application/pdf" className="w-full h-full">
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                                                                PDF
                                                            </div>
                                                        </object>
                                                    </div>
                                                ) : (
                                                    <div className="h-24 flex items-center justify-center bg-gray-100 rounded mb-1">
                                                        <span className="text-gray-400 text-xs">No PDF</span>
                                                    </div>
                                                )}
                                                <p className="text-xs truncate" title={ia.title}>{ia.title}</p>
                                            </div>
                                        ))}
                                        {approvedIAs.length === 0 && (
                                            <div className="col-span-2 text-center py-6 text-gray-500 text-sm">
                                                No approved submissions
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-red-100 p-4 rounded shadow">
                                <h2 className="font-bold">Rejected IAs</h2>
                                <p className="text-2xl">{rejectedIAs.length}</p>
                                
                                <div className="mt-4">
                                    <h3 className="text-sm font-medium mb-2">Not Approved</h3>
                                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                                        {rejectedIAs.slice(0, 10).map((ia) => (
                                            <div key={ia.id} className="bg-white rounded shadow-sm p-1 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('rejected')}>
                                                {ia.pdfUrl ? (
                                                    <div className="h-24 flex items-center justify-center overflow-hidden bg-gray-100 rounded mb-1">
                                                        <object data={ia.pdfUrl + "#page=1&view=FitH"} type="application/pdf" className="w-full h-full">
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                                                                PDF
                                                            </div>
                                                        </object>
                                                    </div>
                                                ) : (
                                                    <div className="h-24 flex items-center justify-center bg-gray-100 rounded mb-1">
                                                        <span className="text-gray-400 text-xs">No PDF</span>
                                                    </div>
                                                )}
                                                <p className="text-xs truncate" title={ia.title}>{ia.title}</p>
                                            </div>
                                        ))}
                                        {rejectedIAs.length === 0 && (
                                            <div className="col-span-2 text-center py-6 text-gray-500 text-sm">
                                                No rejected submissions
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === "approved" && (
                    <div>
                        <h1 className="text-2xl font-bold">Approved IA Submissions</h1>
                        <p className="mb-4">View, edit, and manage approved IA submissions.</p>
                        
                        {loading ? (
                            <div className="flex justify-center my-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        ) : approvedIAs.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded mt-4">
                                <p className="text-gray-500">No approved IAs found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 mt-4">
                                {approvedIAs.map((ia) => (
                                    <div key={ia.id} className="border rounded-lg overflow-hidden shadow-md bg-white border-green-200">
                                        <div className="p-4 border-b flex items-center justify-between bg-green-50">
                                            <div>
                                                <h3 className="font-bold">Submission ID: {ia.id}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {ia.firstName} {ia.lastName} - {ia.title}
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    {ia.email} - Grade {ia.gradeLevel}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                {editingId !== ia.id ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleEditSubmission(ia)}
                                                            className="bg-blue-500 text-white px-4 py-1 cursor-pointer rounded hover:bg-blue-600 transition-colors flex items-center"
                                                        >
                                                            <Edit className="w-4 h-4 mr-1" />
                                                            Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMoveToPending(ia.id)}
                                                            className="bg-yellow-500 text-white px-4 py-1 cursor-pointer rounded hover:bg-yellow-600 transition-colors"
                                                        >
                                                            Move to Pending
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button 
                                                            onClick={(e) => handleUpdateSubmission(e)}
                                                            disabled={isUpdating}
                                                            className={`${isUpdating 
                                                                ? 'bg-gray-400' 
                                                                : 'bg-green-500 hover:bg-green-600'} 
                                                                text-white px-4 py-1 cursor-pointer rounded transition-colors flex items-center`}
                                                        >
                                                            <Save className="w-4 h-4 mr-1" />
                                                            {isUpdating ? 'Saving...' : 'Save Changes'}
                                                        </button>
                                                        <button 
                                                            onClick={handleCancelEdit}
                                                            className="bg-gray-500 text-white px-4 py-1 cursor-pointer rounded hover:bg-gray-600 transition-colors flex items-center"
                                                        >
                                                            <X className="w-4 h-4 mr-1" />
                                                            Cancel
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {editingId === ia.id ? (
                                            <div className="p-4">
                                                <h4 className="font-semibold mb-3">Edit Project Details</h4>
                                                
                                                <div className="mb-4">
                                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                                                        Project Title
                                                    </label>
                                                    <input
                                                        id="title"
                                                        name="title"
                                                        type="text"
                                                        value={editFormData.title || ''}
                                                        onChange={handleFormChange}
                                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                    />
                                                </div>
                                                
                                                <div className="mb-4">
                                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                                                        Project Description
                                                    </label>
                                                    <textarea
                                                        id="description"
                                                        name="description"
                                                        value={editFormData.description || ''}
                                                        onChange={handleFormChange}
                                                        rows={4}
                                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                        placeholder="Enter a description of the project"
                                                    />
                                                </div>
                                                
                                                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {/* Materials selector */}
                                                    <div>
                                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                                            Materials
                                                        </label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {filterCategories.material.map(mat => (
                                                                <button 
                                                                    key={mat}
                                                                    type="button"
                                                                    onClick={() => handleTagToggle('material', mat)}
                                                                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                                                                        editFormData.material?.includes(mat)
                                                                            ? "bg-blue-500 text-white"
                                                                            : "bg-gray-200 hover:bg-gray-300"
                                                                    }`}
                                                                >
                                                                    {editFormData.material?.includes(mat) ? <Check className="w-3 h-3 inline mr-1" /> : null}
                                                                    {mat}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Colors selector */}
                                                    <div>
                                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                                            Colors
                                                        </label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {filterCategories.color.map(col => (
                                                                <button 
                                                                    key={col}
                                                                    type="button"
                                                                    onClick={() => handleTagToggle('color', col)}
                                                                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                                                                        editFormData.color?.includes(col)
                                                                            ? "bg-purple-500 text-white"
                                                                            : "bg-gray-200 hover:bg-gray-300"
                                                                    }`}
                                                                >
                                                                    {editFormData.color?.includes(col) ? <Check className="w-3 h-3 inline mr-1" /> : null}
                                                                    {col}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Functions selector */}
                                                    <div>
                                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                                            Functions
                                                        </label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {filterCategories.function.map(func => (
                                                                <button 
                                                                    key={func}
                                                                    type="button"
                                                                    onClick={() => handleTagToggle('function', func)}
                                                                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                                                                        editFormData.function?.includes(func)
                                                                            ? "bg-green-500 text-white"
                                                                            : "bg-gray-200 hover:bg-gray-300"
                                                                    }`}
                                                                >
                                                                    {editFormData.function?.includes(func) ? <Check className="w-3 h-3 inline mr-1" /> : null}
                                                                    {func}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Images Manager */}
                                                <div className="mb-4">
                                                    <h5 className="text-gray-700 text-sm font-bold mb-2">
                                                        Images Manager
                                                    </h5>
                                                    <p className="text-sm text-gray-500 mb-3">
                                                        Reorder or delete images. The first image will be used as the thumbnail.
                                                    </p>
                                                    
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {ia.imageUrls && ia.imageUrls.length > 0 ? (
                                                            ia.imageUrls.map((img, idx) => (
                                                                <div 
                                                                    key={img}
                                                                    className="relative border rounded overflow-hidden group"
                                                                >
                                                                    <img 
                                                                        src={img} 
                                                                        alt={`Image ${idx + 1}`}
                                                                        className="w-full h-32 object-cover"
                                                                    />
                                                                    
                                                                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <div className="flex gap-1">
                                                                            {idx > 0 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleMoveImage(ia.id || '', img, 'up')}
                                                                                    className="p-1 bg-gray-800 text-white rounded hover:bg-gray-700"
                                                                                    title="Move up"
                                                                                >
                                                                                    <ArrowUp className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                            
                                                                            {idx < ia.imageUrls.length - 1 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleMoveImage(ia.id || '', img, 'down')}
                                                                                    className="p-1 bg-gray-800 text-white rounded hover:bg-gray-700"
                                                                                    title="Move down"
                                                                                >
                                                                                    <ArrowDown className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                            
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteImage(img)}
                                                                                disabled={isImageDeleting}
                                                                                className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                                                                                title="Delete image"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {isImageDeleting && (
                                                                        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                                                                            <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {idx === 0 && (
                                                                        <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-2 py-1">
                                                                            Thumbnail
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="col-span-4 bg-gray-100 p-4 rounded text-gray-500 text-center">
                                                                No images available
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 grid grid-cols-1 md:grid-cols-2">
                                                {/* PDF Preview */}
                                                <div className="mb-4">
                                                    <h4 className="font-semibold mb-2">PDF Document</h4>
                                                    {ia.pdfUrl ? (
                                                        <div className="inline-block border rounded p-2">
                                                            <a 
                                                                href={ia.pdfUrl} 
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                                                            >
                                                                <span>View PDF</span>
                                                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                </svg>
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gray-100 p-2 rounded text-gray-500 text-sm inline-block">
                                                            No PDF available
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Images Preview */}
                                                <div>
                                                    <h4 className="font-semibold mb-2">Uploaded Images</h4>
                                                    {ia.imageUrls && ia.imageUrls.length > 0 ? (
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {ia.imageUrls.map((img, idx) => (
                                                                <a 
                                                                    key={idx}
                                                                    href={img}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="block h-20 bg-gray-100 border rounded overflow-hidden"
                                                                >
                                                                    <img 
                                                                        src={img} 
                                                                        alt={`Preview ${idx + 1}`}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gray-100 p-4 rounded text-gray-500">
                                                            No images available
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Metadata */}
                                        <div className="p-4 border-t">
                                            <h4 className="font-semibold mb-2">Project Details</h4>
                                            
                                            {ia.description && (
                                                <div className="mb-4">
                                                    <h5 className="text-sm font-medium text-gray-700">Description</h5>
                                                    <p className="text-sm text-gray-600 mt-1">{ia.description}</p>
                                                </div>
                                            )}
                                            
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-700">Materials</h5>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {ia.material ? ia.material.map((mat, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                                {mat}
                                                            </span>
                                                        )) : (
                                                            <span className="text-xs text-gray-500">No materials specified</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-700">Colors</h5>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {ia.color ? ia.color.map((col, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                                                {col}
                                                            </span>
                                                        )) : (
                                                            <span className="text-xs text-gray-500">No colors specified</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-700">Functions</h5>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {ia.function ? ia.function.map((func, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                                                {func}
                                                            </span>
                                                        )) : (
                                                            <span className="text-xs text-gray-500">No functions specified</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {activeTab === "pending" && (
                    <div>
                        <h1 className="text-2xl font-bold">Pending IA Approvals</h1>
                        <p className="mb-4">Review, edit, and approve/reject submitted IAs.</p>
                        
                        {loading ? (
                            <div className="flex justify-center my-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        ) : pendingIAs.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded mt-4">
                                <p className="text-gray-500">No pending IAs to approve at this time.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 mt-4">
                                {pendingIAs.map((ia) => (
                                    <div key={ia.id} className="border rounded-lg overflow-hidden shadow-md bg-white border-yellow-200">
                                        <div className="p-4 border-b flex items-center justify-between bg-yellow-50">
                                            <div>
                                                <h3 className="font-bold">Submission ID: {ia.id}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {ia.firstName} {ia.lastName} - {ia.title}
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    {ia.email} - Grade {ia.gradeLevel}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                {editingId !== ia.id ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleEditSubmission(ia)}
                                                            className="bg-blue-500 text-white px-4 py-1 cursor-pointer rounded hover:bg-blue-600 transition-colors flex items-center"
                                                        >
                                                            <Edit className="w-4 h-4 mr-1" />
                                                            Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => handleApproveIA(ia.id)}
                                                            className="bg-green-500 text-white px-4 py-1 cursor-pointer rounded hover:bg-green-600"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => handleRejectIA(ia.id)}
                                                            className="bg-red-500 text-white px-4 py-1 cursor-pointer rounded hover:bg-red-600"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button 
                                                            onClick={(e) => handleUpdateSubmission(e)}
                                                            disabled={isUpdating}
                                                            className={`${isUpdating 
                                                                ? 'bg-gray-400' 
                                                                : 'bg-green-500 hover:bg-green-600'} 
                                                                text-white px-4 py-1 cursor-pointer rounded transition-colors flex items-center`}
                                                        >
                                                            <Save className="w-4 h-4 mr-1" />
                                                            {isUpdating ? 'Saving...' : 'Save Changes'}
                                                        </button>
                                                        <button 
                                                            onClick={handleCancelEdit}
                                                            className="bg-gray-500 text-white px-4 py-1 cursor-pointer rounded hover:bg-gray-600 transition-colors flex items-center"
                                                        >
                                                            <X className="w-4 h-4 mr-1" />
                                                            Cancel
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {editingId === ia.id ? (
                                            <div className="p-4">
                                                <h4 className="font-semibold mb-3">Edit Project Details</h4>
                                                
                                                <div className="mb-4">
                                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                                                        Project Title
                                                    </label>
                                                    <input
                                                        id="title"
                                                        name="title"
                                                        type="text"
                                                        value={editFormData.title || ''}
                                                        onChange={handleFormChange}
                                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                    />
                                                </div>
                                                
                                                <div className="mb-4">
                                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                                                        Project Description
                                                    </label>
                                                    <textarea
                                                        id="description"
                                                        name="description"
                                                        value={editFormData.description || ''}
                                                        onChange={handleFormChange}
                                                        rows={4}
                                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                        placeholder="Enter a description of the project"
                                                    />
                                                </div>
                                                
                                                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {/* Materials selector */}
                                                    <div>
                                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                                            Materials
                                                        </label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {filterCategories.material.map(mat => (
                                                                <button 
                                                                    key={mat}
                                                                    type="button"
                                                                    onClick={() => handleTagToggle('material', mat)}
                                                                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                                                                        editFormData.material?.includes(mat)
                                                                            ? "bg-blue-500 text-white"
                                                                            : "bg-gray-200 hover:bg-gray-300"
                                                                    }`}
                                                                >
                                                                    {editFormData.material?.includes(mat) ? <Check className="w-3 h-3 inline mr-1" /> : null}
                                                                    {mat}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Colors selector */}
                                                    <div>
                                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                                            Colors
                                                        </label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {filterCategories.color.map(col => (
                                                                <button 
                                                                    key={col}
                                                                    type="button"
                                                                    onClick={() => handleTagToggle('color', col)}
                                                                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                                                                        editFormData.color?.includes(col)
                                                                            ? "bg-purple-500 text-white"
                                                                            : "bg-gray-200 hover:bg-gray-300"
                                                                    }`}
                                                                >
                                                                    {editFormData.color?.includes(col) ? <Check className="w-3 h-3 inline mr-1" /> : null}
                                                                    {col}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Functions selector */}
                                                    <div>
                                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                                            Functions
                                                        </label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {filterCategories.function.map(func => (
                                                                <button 
                                                                    key={func}
                                                                    type="button"
                                                                    onClick={() => handleTagToggle('function', func)}
                                                                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                                                                        editFormData.function?.includes(func)
                                                                            ? "bg-green-500 text-white"
                                                                            : "bg-gray-200 hover:bg-gray-300"
                                                                    }`}
                                                                >
                                                                    {editFormData.function?.includes(func) ? <Check className="w-3 h-3 inline mr-1" /> : null}
                                                                    {func}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Images Manager */}
                                                <div className="mb-4">
                                                    <h5 className="text-gray-700 text-sm font-bold mb-2">
                                                        Images Manager
                                                    </h5>
                                                    <p className="text-sm text-gray-500 mb-3">
                                                        Reorder or delete images. The first image will be used as the thumbnail.
                                                    </p>
                                                    
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {ia.imageUrls && ia.imageUrls.length > 0 ? (
                                                            ia.imageUrls.map((img, idx) => (
                                                                <div 
                                                                    key={img}
                                                                    className="relative border rounded overflow-hidden group"
                                                                >
                                                                    <img 
                                                                        src={img} 
                                                                        alt={`Image ${idx + 1}`}
                                                                        className="w-full h-32 object-cover"
                                                                    />
                                                                    
                                                                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <div className="flex gap-1">
                                                                            {idx > 0 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleMoveImage(ia.id || '', img, 'up')}
                                                                                    className="p-1 bg-gray-800 text-white rounded hover:bg-gray-700"
                                                                                    title="Move up"
                                                                                >
                                                                                    <ArrowUp className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                            
                                                                            {idx < ia.imageUrls.length - 1 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleMoveImage(ia.id || '', img, 'down')}
                                                                                    className="p-1 bg-gray-800 text-white rounded hover:bg-gray-700"
                                                                                    title="Move down"
                                                                                >
                                                                                    <ArrowDown className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                            
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteImage(img)}
                                                                                disabled={isImageDeleting}
                                                                                className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                                                                                title="Delete image"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {isImageDeleting && (
                                                                        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                                                                            <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {idx === 0 && (
                                                                        <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-2 py-1">
                                                                            Thumbnail
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="col-span-4 bg-gray-100 p-4 rounded text-gray-500 text-center">
                                                                No images available
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 grid grid-cols-1 md:grid-cols-2">
                                                {/* PDF Preview */}
                                                <div className="mb-4">
                                                    <h4 className="font-semibold mb-2">PDF Document</h4>
                                                    {ia.pdfUrl ? (
                                                        <div className="inline-block border rounded p-2">
                                                            <a 
                                                                href={ia.pdfUrl} 
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                                                            >
                                                                <span>View PDF</span>
                                                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                </svg>
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gray-100 p-2 rounded text-gray-500 text-sm inline-block">
                                                            No PDF available
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Images Preview */}
                                                <div>
                                                    <h4 className="font-semibold mb-2">Uploaded Images</h4>
                                                    {ia.imageUrls && ia.imageUrls.length > 0 ? (
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {ia.imageUrls.map((img, idx) => (
                                                                <a 
                                                                    key={idx}
                                                                    href={img}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="block h-20 bg-gray-100 border rounded overflow-hidden"
                                                                >
                                                                    <img 
                                                                        src={img} 
                                                                        alt={`Preview ${idx + 1}`}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-gray-100 p-4 rounded text-gray-500">
                                                            No images available
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Metadata */}
                                        <div className="p-4 border-t">
                                            <h4 className="font-semibold mb-2">Project Details</h4>
                                            
                                            {ia.description && (
                                                <div className="mb-4">
                                                    <h5 className="text-sm font-medium text-gray-700">Description</h5>
                                                    <p className="text-sm text-gray-600 mt-1">{ia.description}</p>
                                                </div>
                                            )}
                                            
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-700">Materials</h5>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {ia.material ? ia.material.map((mat, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                                {mat}
                                                            </span>
                                                        )) : (
                                                            <span className="text-xs text-gray-500">No materials specified</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-700">Colors</h5>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {ia.color ? ia.color.map((col, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                                                {col}
                                                            </span>
                                                        )) : (
                                                            <span className="text-xs text-gray-500">No colors specified</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-700">Functions</h5>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {ia.function ? ia.function.map((func, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                                                {func}
                                                            </span>
                                                        )) : (
                                                            <span className="text-xs text-gray-500">No functions specified</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {activeTab === "rejected" && (
                    <div>
                        <h1 className="text-2xl font-bold">Rejected Submissions</h1>
                        <p className="mb-4">View and manage rejected IA submissions.</p>
                        
                        {loading ? (
                            <div className="flex justify-center my-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        ) : rejectedIAs.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded mt-4">
                                <p className="text-gray-500">No rejected IAs found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-6 mt-4">
                                {rejectedIAs.map((ia) => (
                                    <div key={ia.id} className="border rounded-lg overflow-hidden shadow-md bg-white border-red-200">
                                        <div className="p-4 border-b flex items-center justify-between bg-red-50">
                                            <div>
                                                <h3 className="font-bold">Submission ID: {ia.id}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {ia.firstName} {ia.lastName} - {ia.title}
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    {ia.email} - Grade {ia.gradeLevel}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleMoveToPending(ia.id)}
                                                    className="bg-yellow-500 text-white px-4 py-1 cursor-pointer rounded hover:bg-yellow-600 transition-colors"
                                                >
                                                    Move to Pending
                                                </button>
                                                <button 
                                                    onClick={() => handlePermanentDelete(ia.id)}
                                                    disabled={isDeleting === ia.id}
                                                    className={`${isDeleting === ia.id 
                                                        ? 'bg-gray-500' 
                                                        : 'bg-red-500 hover:bg-red-600'} 
                                                        text-white px-4 py-1 cursor-pointer rounded transition-colors`}
                                                >
                                                    {isDeleting === ia.id ? 'Deleting...' : 'Remove Completely'}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2">
                                            {/* PDF Preview */}
                                            <div className="mb-4">
                                                <h4 className="font-semibold mb-2">PDF Document</h4>
                                                {ia.pdfUrl ? (
                                                    <div className="inline-block border rounded p-2">
                                                        <a 
                                                            href={ia.pdfUrl} 
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                                                        >
                                                            <span>View PDF</span>
                                                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                            </svg>
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <div className="bg-gray-100 p-2 rounded text-gray-500 text-sm inline-block">
                                                        No PDF available
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Images Preview */}
                                            <div>
                                                <h4 className="font-semibold mb-2">Uploaded Images</h4>
                                                {ia.imageUrls && ia.imageUrls.length > 0 ? (
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {ia.imageUrls.map((img, idx) => (
                                                            <a 
                                                                key={idx}
                                                                href={img}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="block h-20 bg-gray-100 border rounded overflow-hidden"
                                                            >
                                                                <img 
                                                                    src={img} 
                                                                    alt={`Preview ${idx + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </a>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="bg-gray-100 p-4 rounded text-gray-500">
                                                        No images available
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Metadata */}
                                        <div className="p-4 border-t">
                                            <h4 className="font-semibold mb-2">Project Details</h4>
                                            
                                            {ia.description && (
                                                <div className="mb-4">
                                                    <h5 className="text-sm font-medium text-gray-700">Description</h5>
                                                    <p className="text-sm text-gray-600 mt-1">{ia.description}</p>
                                                </div>
                                            )}
                                            
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-700">Materials</h5>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {ia.material ? ia.material.map((mat, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                                {mat}
                                                            </span>
                                                        )) : (
                                                            <span className="text-xs text-gray-500">No materials specified</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-700">Colors</h5>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {ia.color ? ia.color.map((col, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                                                {col}
                                                            </span>
                                                        )) : (
                                                            <span className="text-xs text-gray-500">No colors specified</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-700">Functions</h5>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {ia.function ? ia.function.map((func, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                                                {func}
                                                            </span>
                                                        )) : (
                                                            <span className="text-xs text-gray-500">No functions specified</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {activeTab === "classification" && (
                    <div>
                        <h1 className="text-2xl font-bold">Project Management</h1>
                        <p className="mb-4">Edit project details, manage project metadata, and organize project content.</p>
                        
                        <div className="bg-green-50 p-6 rounded border border-green-200 mb-6">
                            <h2 className="font-bold text-green-800 mb-2">New Management Features Available!</h2>
                            <p className="text-green-700">
                                You can now edit project details directly from the "Approved" tab. Changes you make
                                will immediately reflect in the gallery.
                            </p>
                            <ul className="list-disc list-inside mt-2 text-green-700">
                                <li>Edit project titles</li>
                                <li>Modify classifications (materials, colors, functions)</li>
                                <li>Remove, reorder, or manage images</li>
                                <li>Preview changes before saving</li>
                            </ul>
                        </div>
                        
                        <div className="flex justify-center">
                            <button 
                                onClick={() => setActiveTab("approved")}
                                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Go to Approved Projects
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;