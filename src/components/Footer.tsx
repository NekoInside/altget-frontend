import { useEffect, useState } from 'react'
import { apiGet } from '@/api/http'
import { FRONTEND_BUILD_INFO } from '@/generated/build-info'
import './Footer.css'

const FRONTEND_REPO = 'https://github.com/NekoInside/altget-frontend'
const BACKEND_REPO = 'https://github.com/NekoInside/altget-backend-kotlin'

interface BuildInfoDisplay {
  commit: string
  branch: string
  // Additional details shown in tooltip
  details: { label: string; value: string }[]
}

function formatBuildInfo(raw: Record<string, string>): BuildInfoDisplay {
  const commit = raw['git.commit.id'] ?? 'unknown'
  const branch = raw['git.branch'] ?? 'unknown'
  const details: { label: string; value: string }[] = [
    { label: 'Commit', value: commit },
    { label: 'Branch', value: branch },
  ]
  if (raw['git.commit.time']) details.push({ label: 'Commit Time', value: raw['git.commit.time'] })
  if (raw['build.time']) details.push({ label: 'Build Time', value: raw['build.time'] })
  if (raw['build.version']) details.push({ label: 'Version', value: raw['build.version'] })
  if (raw['build.kotlin.version']) details.push({ label: 'Kotlin', value: raw['build.kotlin.version'] })
  if (raw['build.spring.boot.version']) details.push({ label: 'Spring Boot', value: raw['build.spring.boot.version'] })
  if (raw['build.java.version']) details.push({ label: 'Java', value: raw['build.java.version'] })
  if (raw['build.java.vm']) details.push({ label: 'JVM', value: raw['build.java.vm'] })
  return { commit, branch, details }
}

function FrontendBuildSection() {
  const { commit, branch, commitTime, buildTime } = FRONTEND_BUILD_INFO
  const details: { label: string; value: string }[] = [
    { label: 'Commit', value: commit },
    { label: 'Branch', value: branch },
    { label: 'Commit Time', value: commitTime },
    { label: 'Build Time', value: buildTime },
  ]
  return (
    <BuildSection
      label="前端"
      commit={commit}
      branch={branch}
      details={details}
      repoUrl={FRONTEND_REPO}
    />
  )
}

function BackendBuildSection() {
  const [info, setInfo] = useState<BuildInfoDisplay | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    apiGet<Record<string, string>>('/build-info')
      .then((res) => {
        if (res.code === 0 && res.data) {
          setInfo(formatBuildInfo(res.data))
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
  }, [])

  if (error) return null
  if (!info) {
    return (
      <div className="footer-build footer-build--loading">
        <span className="footer-build-label">后端</span>
        <span className="footer-build-value mono">加载中…</span>
      </div>
    )
  }

  return (
    <BuildSection
      label="后端"
      commit={info.commit}
      branch={info.branch}
      details={info.details}
      repoUrl={BACKEND_REPO}
    />
  )
}

function BuildSection({
  label,
  commit,
  branch,
  details,
  repoUrl,
}: {
  label: string
  commit: string
  branch: string
  details: { label: string; value: string }[]
  repoUrl: string
}) {
  return (
    <div className="footer-build">
      <span className="footer-build-label">{label}</span>
      <a
        className="footer-build-value mono"
        href={`${repoUrl}/tree/${commit}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {branch}/{commit}
      </a>
      {/* Custom tooltip — not relying on browser title/alt */}
      <div className="footer-build-tooltip" role="tooltip">
        {details.map((d) => (
          <div key={d.label} className="footer-build-tooltip-row">
            <span className="footer-build-tooltip-label">{d.label}</span>
            <span className="footer-build-tooltip-value mono">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner container-wide">
        <FrontendBuildSection />
        <BackendBuildSection />
      </div>
    </footer>
  )
}
