import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import {
    Box,
    Typography,
    Stack,
    Paper,
    Button,
    Chip,
    Divider,
    CircularProgress,
} from '@mui/material'

type AdminMarker = {
    id: number
    lat: number
    lng: number
    category: string
    title: string
    description?: string
    isPublic: boolean
    isActive: boolean
    username: string
    userPublicId?: string | null
    reviewStatus?: string
    lastEditedBy?: string
    lastEditedByOwner?: boolean
    createdAt?: string
    updatedAt?: string
}

type PendingImageProposal = {
    id: number
    markerId: number
    markerTitle: string
    proposerUsername: string
    imageUrl: string
    status?: string
    createdAt?: string
}

type PendingEditProposal = {
    id: number
    markerId: number
    markerTitle: string
    lat: number
    lng: number
    category: string
    title: string
    description?: string
    isPublic: boolean
    isActive: boolean
    openTimeStart?: string | null
    openTimeEnd?: string | null
    proposerUsername: string
    proposerPublicId?: string | null
    proposerIsOwner?: boolean
    status?: string
    createdAt?: string
}

const statusColor = (status?: string) => {
    switch ((status || '').toUpperCase()) {
        case 'APPROVED':
            return 'success' as const
        case 'REJECTED':
            return 'error' as const
        default:
            return 'warning' as const
    }
}

export default function Admin() {
    const [pending, setPending] = useState<AdminMarker[]>([])
    const [pendingEdits, setPendingEdits] = useState<PendingEditProposal[]>([])
    const [pendingImages, setPendingImages] = useState<PendingImageProposal[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const getErrorMessage = (err: unknown, fallback: string) => {
        if (typeof err === 'object' && err !== null && 'response' in err) {
            const response = (err as { response?: { data?: unknown } }).response
            const data = response?.data
            if (typeof data === 'string') return data
            if (data && typeof data === 'object' && 'message' in data) {
                const msg = (data as { message?: unknown }).message
                if (typeof msg === 'string') return msg
            }
        }
        return fallback
    }

    const loadPending = useCallback(async () => {
        try {
            setLoading(true)
            const [markerRes, editRes, imageRes] = await Promise.all([
                axios.get<AdminMarker[]>('/api/admin/markers/pending', { withCredentials: true }),
                axios.get<PendingEditProposal[]>('/api/admin/markers/pending-edits', { withCredentials: true }),
                axios.get<PendingImageProposal[]>('/api/admin/markers/pending-images', { withCredentials: true }),
            ])
            setPending(markerRes.data || [])
            setPendingEdits(editRes.data || [])
            setPendingImages(imageRes.data || [])
            setError(null)
        } catch (e: unknown) {
            setError(getErrorMessage(e, '无法加载审核列表'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void loadPending()
    }, [loadPending])

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        try {
            await axios.post(`/api/admin/markers/${id}/${action}`, null, { withCredentials: true })
            setPending(prev => prev.filter(item => item.id !== id))
        } catch (e: unknown) {
            setError(getErrorMessage(e, '操作失败'))
        }
    }

    const handleImageAction = async (id: number, action: 'approve' | 'reject') => {
        try {
            await axios.post(`/api/admin/markers/image-proposals/${id}/${action}`, null, { withCredentials: true })
            setPendingImages((prev) => prev.filter((item) => item.id !== id))
        } catch (e: unknown) {
            setError(getErrorMessage(e, '图片提案操作失败'))
        }
    }

    const handleEditAction = async (id: number, action: 'approve' | 'reject') => {
        try {
            await axios.post(`/api/admin/markers/edit-proposals/${id}/${action}`, null, { withCredentials: true })
            setPendingEdits((prev) => prev.filter((item) => item.id !== id))
        } catch (e: unknown) {
            setError(getErrorMessage(e, '编辑提案操作失败'))
        }
    }

    return (
        <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
            <Stack spacing={2}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    点位审核
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    仅管理员可访问此页面。新建/修改点位需要审核通过后才会对外展示。
                </Typography>
                <Divider />
                {loading ? (
                    <Stack alignItems="center" sx={{ py: 6 }}>
                        <CircularProgress />
                    </Stack>
                ) : error ? (
                    <Paper sx={{ p: 2, bgcolor: '#fff3f3', border: '1px solid #f5c2c2' }}>
                        <Typography color="error">{String(error)}</Typography>
                    </Paper>
                ) : (
                    <Stack spacing={2}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            待审核点位
                        </Typography>
                        {pending.length === 0 ? (
                            <Paper sx={{ p: 2 }}>
                                <Typography color="text.secondary">暂无待审核点位</Typography>
                            </Paper>
                        ) : (
                            pending.map(item => (
                                <Paper key={item.id} sx={{ p: 2, borderRadius: 2 }}>
                                    <Stack spacing={1.2}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                {item.title}
                                            </Typography>
                                            <Chip size="small" label={item.category} />
                                            <Chip size="small" color={statusColor(item.reviewStatus)} label="待审核" />
                                            {item.lastEditedByOwner === false ? (
                                                <Chip size="small" color="warning" label="非本人编辑" />
                                            ) : null}
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">
                                            {item.description || '（无描述）'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            坐标：{item.lat.toFixed(6)}, {item.lng.toFixed(6)} ·
                                            提交者：{item.username}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            编辑人：{item.lastEditedBy || item.username}
                                            {item.lastEditedByOwner === false ? '（非本人编辑）' : ''}
                                        </Typography>
                                        {item.lastEditedByOwner === false ? (
                                            <Typography variant="caption" color="warning.main">
                                                审核备注：非本人编辑
                                            </Typography>
                                        ) : null}
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                variant="contained"
                                                color="success"
                                                onClick={() => handleAction(item.id, 'approve')}
                                            >
                                                通过
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleAction(item.id, 'reject')}
                                            >
                                                拒绝
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            ))
                        )}

                        <Divider />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            待审核编辑提案
                        </Typography>
                        {pendingEdits.length === 0 ? (
                            <Paper sx={{ p: 2 }}>
                                <Typography color="text.secondary">暂无待审核编辑提案</Typography>
                            </Paper>
                        ) : (
                            pendingEdits.map((item) => (
                                <Paper key={`edit-${item.id}`} sx={{ p: 2, borderRadius: 2 }}>
                                    <Stack spacing={1.2}>
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                {item.title}
                                            </Typography>
                                            <Chip size="small" label={item.category} />
                                            <Chip size="small" color="warning" label="编辑待审核" />
                                            {item.proposerIsOwner === false ? (
                                                <Chip size="small" color="warning" label="非本人编辑" />
                                            ) : null}
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">
                                            原点位：{item.markerTitle}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {item.description || '（无描述）'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            点位ID：{item.markerId} · 坐标：{item.lat.toFixed(6)}, {item.lng.toFixed(6)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            提交者：{item.proposerUsername}
                                            {item.proposerIsOwner === false ? '（非本人编辑）' : ''}
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                variant="contained"
                                                color="success"
                                                onClick={() => handleEditAction(item.id, 'approve')}
                                            >
                                                通过
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleEditAction(item.id, 'reject')}
                                            >
                                                拒绝
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            ))
                        )}

                        <Divider />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            待审核图片提案
                        </Typography>
                        {pendingImages.length === 0 ? (
                            <Paper sx={{ p: 2 }}>
                                <Typography color="text.secondary">暂无待审核图片</Typography>
                            </Paper>
                        ) : (
                            pendingImages.map((item) => (
                                <Paper key={`img-${item.id}`} sx={{ p: 2, borderRadius: 2 }}>
                                    <Stack spacing={1.2}>
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                {item.markerTitle}
                                            </Typography>
                                            <Chip size="small" color="warning" label="图片待审核" />
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary">
                                            点位ID：{item.markerId} · 提交者：{item.proposerUsername}
                                        </Typography>
                                        <Box
                                            component="img"
                                            src={item.imageUrl}
                                            alt={item.markerTitle}
                                            sx={{
                                                width: '100%',
                                                maxWidth: 280,
                                                maxHeight: 180,
                                                borderRadius: 1.5,
                                                objectFit: 'cover',
                                                display: 'block',
                                            }}
                                        />
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                variant="contained"
                                                color="success"
                                                onClick={() => handleImageAction(item.id, 'approve')}
                                            >
                                                通过
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleImageAction(item.id, 'reject')}
                                            >
                                                拒绝
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            ))
                        )}
                    </Stack>
                )}
            </Stack>
        </Box>
    )
}
