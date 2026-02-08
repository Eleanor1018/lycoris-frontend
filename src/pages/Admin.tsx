import { useEffect, useState } from 'react'
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
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadPending = async () => {
        try {
            setLoading(true)
            const res = await axios.get<AdminMarker[]>('/api/admin/markers/pending', {
                withCredentials: true,
            })
            setPending(res.data || [])
            setError(null)
        } catch (e: any) {
            setError(e?.response?.data || '无法加载审核列表')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadPending()
    }, [])

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        try {
            await axios.post(`/api/admin/markers/${id}/${action}`, null, { withCredentials: true })
            setPending(prev => prev.filter(item => item.id !== id))
        } catch (e: any) {
            setError(e?.response?.data || '操作失败')
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
                ) : pending.length === 0 ? (
                    <Paper sx={{ p: 2 }}>
                        <Typography color="text.secondary">暂无待审核点位</Typography>
                    </Paper>
                ) : (
                    <Stack spacing={2}>
                        {pending.map(item => (
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
                        ))}
                    </Stack>
                )}
            </Stack>
        </Box>
    )
}
