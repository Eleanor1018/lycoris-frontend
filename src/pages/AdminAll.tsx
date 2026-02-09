import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
    Box,
    Typography,
    Stack,
    Paper,
    Button,
    Chip,
    Divider,
    TextField,
    CircularProgress,
} from '@mui/material'
import MarkerFormDialog, { type DraftMarker } from '../components/MarkerFormDialog'

type AdminMarker = {
    id: number
    lat: number
    lng: number
    category: string
    title: string
    description?: string
    isPublic: boolean
    isActive: boolean
    openTimeStart?: string | null
    openTimeEnd?: string | null
    markImage?: string | null
    username: string
    userPublicId?: string | null
    reviewStatus?: string
    lastEditedBy?: string
    lastEditedByOwner?: boolean
}

const categoryLabel: Record<string, string> = {
    accessible_toilet: '无障碍卫生间',
    friendly_clinic: '友好医疗机构',
    conversion_therapy: '扭转机构/风险点位',
    self_definition: '自定义',
}

const toDraft = (marker: AdminMarker): DraftMarker => ({
    tempId: String(marker.id),
    lat: marker.lat,
    lng: marker.lng,
    category: marker.category as DraftMarker['category'],
    title: marker.title,
    description: marker.description ?? '',
    isPublic: marker.isPublic,
    openTimeStart: marker.openTimeStart ?? '',
    openTimeEnd: marker.openTimeEnd ?? '',
    markImage: marker.markImage ?? undefined,
})

export default function AdminAll() {
    const [markers, setMarkers] = useState<AdminMarker[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [passcode, setPasscode] = useState('')
    const [verified, setVerified] = useState(false)

    const [draft, setDraft] = useState<DraftMarker | null>(null)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [markImageFile, setMarkImageFile] = useState<File | null>(null)
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

    const filteredMarkers = useMemo(() => markers, [markers])

    const loadAll = useCallback(async () => {
        setLoading(true)
        try {
            const res = await axios.get<AdminMarker[]>('/api/admin/markers/all', { withCredentials: true })
            setMarkers(res.data || [])
            setError(null)
        } catch (e: unknown) {
            const message = getErrorMessage(e, '无法加载点位列表')
            if (String(message).includes('二级密码')) {
                setVerified(false)
            }
            setError(String(message))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (verified) {
            void loadAll()
        }
    }, [verified, loadAll])

    const handleVerify = async () => {
        try {
            await axios.post(
                '/api/admin/verify',
                { passcode },
                { withCredentials: true }
            )
            setVerified(true)
            setError(null)
        } catch (e: unknown) {
            setError(getErrorMessage(e, '二级密码验证失败'))
        }
    }

    const openEditor = (marker: AdminMarker) => {
        setEditingId(marker.id)
        setDraft(toDraft(marker))
        setMarkImageFile(null)
    }

    const handleSave = async () => {
        if (!draft || !editingId) return
        try {
            const res = await axios.patch<AdminMarker>(
                `/api/admin/markers/${editingId}`,
                {
                    category: draft.category,
                    title: draft.title,
                    description: draft.description,
                    isPublic: draft.isPublic,
                    openTimeStart: draft.openTimeStart || '',
                    openTimeEnd: draft.openTimeEnd || '',
                },
                { withCredentials: true }
            )
            setMarkers((prev) => prev.map((m) => (m.id === editingId ? res.data : m)))
            setEditingId(null)
            setDraft(null)
        } catch (e: unknown) {
            setError(getErrorMessage(e, '保存失败'))
        }
    }

    const handleDelete = async () => {
        if (!editingId) return
        try {
            await axios.delete(`/api/admin/markers/${editingId}`, { withCredentials: true })
            setMarkers((prev) => prev.filter((m) => m.id !== editingId))
            setEditingId(null)
            setDraft(null)
        } catch (e: unknown) {
            setError(getErrorMessage(e, '删除失败'))
        }
    }

    return (
        <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
            <Stack spacing={2}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    管理后台 · 全量点位
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    本页面需要二级密码验证；请仅在可信设备与 HTTPS 环境使用。
                </Typography>
                <Divider />

                {!verified ? (
                    <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <Stack spacing={2}>
                            <Typography sx={{ fontWeight: 600 }}>输入二级密码</Typography>
                            <TextField
                                type="password"
                                label="二级密码"
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                fullWidth
                            />
                            <Button variant="contained" onClick={handleVerify} sx={{ alignSelf: 'flex-start' }}>
                                验证
                            </Button>
                        </Stack>
                    </Paper>
                ) : loading ? (
                    <Stack alignItems="center" sx={{ py: 6 }}>
                        <CircularProgress />
                    </Stack>
                ) : error ? (
                    <Paper sx={{ p: 2, bgcolor: '#fff3f3', border: '1px solid #f5c2c2' }}>
                        <Typography color="error">{String(error)}</Typography>
                    </Paper>
                ) : (
                    <Stack spacing={2}>
                        {filteredMarkers.map((item) => (
                            <Paper key={item.id} sx={{ p: 2, borderRadius: 2 }}>
                                <Stack spacing={1.2}>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                            {item.title}
                                        </Typography>
                                        <Chip size="small" label={item.category} />
                                        <Chip size="small" label={`状态: ${item.reviewStatus ?? '未知'}`} />
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
                                        <Button variant="outlined" onClick={() => openEditor(item)}>
                                            编辑
                                        </Button>
                                        <Button variant="text" color="error" onClick={() => openEditor(item)}>
                                            删除
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                )}
            </Stack>

            <MarkerFormDialog
                open={Boolean(draft)}
                draft={draft}
                editingId={editingId}
                canDelete={true}
                categoryLabel={categoryLabel}
                markImageFile={markImageFile}
                setDraft={setDraft}
                onClose={() => {
                    setDraft(null)
                    setEditingId(null)
                }}
                onSave={handleSave}
                onDelete={handleDelete}
                onMarkImageChange={setMarkImageFile}
            />
        </Box>
    )
}
