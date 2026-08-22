from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .catalog import FEATURES, GARAGE, SERVICES, TEAM, TESTIMONIALS


@api_view(['GET'])
def health(request):
    return Response({
        'status': 'ok',
        'project': 'CarSV',
        'message': 'Django API is running. Business data and models are not implemented yet.',
    })


@api_view(['GET'])
def api_status(request):
    return Response({
        'frontend': 'React (Vite)',
        'mobile': 'React Native (Expo)',
        'backend': 'Django + Django REST Framework',
        'database': 'SQLite (empty foundation)',
        'ready_for': [
            'customers',
            'vehicles',
            'appointments',
            'repair_tasks',
            'inventory',
            'billing',
        ],
        'note': 'Catalog endpoints return sample content. No garage records are stored yet.',
    })


@api_view(['GET'])
def catalog(request):
    return Response({
        'garage': GARAGE,
        'features': FEATURES,
        'services': SERVICES,
        'team': TEAM,
        'testimonials': TESTIMONIALS,
    })


@api_view(['POST'])
def booking(request):
    name = (request.data.get('name') or '').strip()
    email = (request.data.get('email') or '').strip()
    service = (request.data.get('service') or '').strip()
    date = (request.data.get('date') or '').strip()

    if not name or not email or not service:
        return Response(
            {'ok': False, 'message': 'Name, email, and service are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({
        'ok': True,
        'message': 'Booking received. It is not saved to the database yet.',
        'booking': {
            'name': name,
            'email': email,
            'service': service,
            'date': date,
            'request': (request.data.get('request') or '').strip(),
        },
    })


@api_view(['POST'])
def contact(request):
    name = (request.data.get('name') or '').strip()
    email = (request.data.get('email') or '').strip()
    message = (request.data.get('message') or '').strip()

    if not name or not email or not message:
        return Response(
            {'ok': False, 'message': 'Name, email, and message are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({
        'ok': True,
        'message': 'Message received. It is not saved to the database yet.',
    })
